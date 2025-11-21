# 🔗 Multi-Table Query Examples

Các ví dụ cụ thể về multi-table queries trong Cassandra với Node.js

## 🎯 Tổng quan

File này cung cấp các ví dụ thực tế về cách query nhiều table cùng lúc trong Cassandra, được thiết kế đặc biệt để trả lời câu hỏi của bạn về **"query nhiều table với nhau"**.

## 📚 Các Pattern Chính

### 1. **Application-Level Joins**
### 2. **Denormalization Queries**
### 3. **Parallel Multi-Table Queries**
### 4. **Aggregation Across Tables**

---

## 🔄 Pattern 1: Application-Level Joins

### Ví dụ: User Profile với Data từ 4 Tables

```javascript
// models/UserProfile.js
async getProfileWithDetails(userId, options = {}) {
    // Query 4 tables PARALLEL để lấy complete user data
    const [profile, posts, followers, following] = await Promise.all([
        // 1. user_profiles table
        this.findById(userId),

        // 2. posts_by_user table (time-series)
        this.getUserRecentPosts(userId, options.postsLimit || 10),

        // 3. user_followers table (many-to-many)
        this.getUserFollowers(userId, options.followersLimit || 20),

        // 4. user_following table (reverse relationship)
        this.getUserFollowing(userId, options.followingLimit || 20)
    ]);

    // Combine data từ 4 tables
    return {
        ...profile,
        recent_posts: posts,
        followers: followers,
        following: following,
        stats: {
            total_posts: profile.posts_count,
            total_followers: profile.followers_count,
            total_following: profile.following_count
        }
    };
}
```

### Sử dụng:

```javascript
// Lấy user với data từ 4 tables
const userWithDetails = await UserProfile.getProfileWithDetails('user-123', {
    postsLimit: 5,
    followersLimit: 10,
    followingLimit: 10
});

console.log('User:', userWithDetails.name);
console.log('Recent posts:', userWithDetails.recent_posts.length);
console.log('Followers:', userWithDetails.followers.length);
console.log('Following:', userWithDetails.following.length);
```

---

## 🔁 Pattern 2: Denormalization Queries

### Ví dụ: Post với Complete Relationships

```javascript
// models/AdvancedPost.js
async getPostById(postId) {
    // Query 4 tables để lấy complete post data
    const [postResult, comments, likes] = await Promise.all([
        // 1. posts table (main data)
        client.execute(`SELECT * FROM posts WHERE id = ?`, [postId]),

        // 2. comments table (nested data)
        this.getPostComments(postId),

        // 3. post_likes table (relationship data)
        this.getPostLikes(postId)
    ]);

    const post = postResult.rows[0];
    if (!post) return null;

    // Query additional tables for denormalized data
    const [userProfile, categoryInfo] = await Promise.all([
        // 4. user_profiles table (author info)
        UserProfile.findById(post.user_id),

        // 5. categories table (category info via posts_by_category)
        this.getPostCategory(postId)
    ]);

    return {
        ...post,
        author: userProfile,      // From user_profiles
        category: categoryInfo,   // From categories
        comments: comments,       // From comments
        likes: likes,            // From post_likes
        stats: {
            comments_count: comments.length,
            likes_count: likes.length
        }
    };
}
```

### Schema Denormalized:

```sql
-- Post được lưu ở multiple tables cho different access patterns
CREATE TABLE posts (
    id UUID PRIMARY KEY,
    user_id UUID,
    title TEXT,
    content TEXT
);

CREATE TABLE posts_by_category (
    category_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    user_id UUID,     -- DENORMALIZED từ posts
    title TEXT,       -- DENORMALIZED từ posts
    content TEXT,     -- DENORMALIZED từ posts
    PRIMARY KEY (category_id, created_at, post_id)
);

CREATE TABLE posts_by_user (
    user_id UUID,
    year INT,
    created_at TIMESTAMP,
    post_id UUID,
    category_id UUID, -- DENORMALIZED
    title TEXT,       -- DENORMALIZED
    content TEXT,     -- DENORMALIZED
    PRIMARY KEY ((user_id, year), created_at, post_id)
);
```

---

## ⚡ Pattern 3: Parallel Multi-Table Queries

### Ví dụ: Dashboard Data từ 6 Tables

```javascript
// Lấy dashboard data từ multiple tables
async getDashboardData(userId) {
    // 6 queries PARALLEL thay vì sequential
    const [
        userProfile,      // user_profiles table
        recentPosts,      // posts_by_user table
        hotPosts,         // posts_by_category table
        trendingTags,     // tag_statistics table
        recentActivity,   // user_activity_feed table
        followingPosts    // posts từ users being followed
    ] = await Promise.all([
        UserProfile.findById(userId),
        this.getUserRecentPosts(userId, 5),
        AdvancedPost.getHotPosts(null, 10),
        AdvancedPost.getTrendingTags(5),
        this.getUserActivity(userId, 10),
        this.getFollowingPosts(userId, 10)
    ]);

    return {
        user: userProfile,
        content: {
            my_recent_posts: recentPosts,
            hot_posts: hotPosts,
            following_posts: followingPosts
        },
        trends: {
            trending_tags: trendingTags
        },
        activity: recentActivity
    };
}
```

### Cross-Table Search Example:

```javascript
// Search across categories VÀ posts tables
async searchCategoriesAndPosts(searchTerm, limit = 50) {
    // 2 parallel searches
    const [categoriesPromise, postsPromise] = await Promise.all([
        // Search trong categories table
        client.execute(
            `SELECT * FROM categories
             WHERE name CONTAINS ? ALLOW FILTERING LIMIT ?`,
            [searchTerm, limit]
        ),

        // Search trong posts_by_category table
        client.execute(
            `SELECT DISTINCT category_id, post_id, title, user_id
             FROM posts_by_category
             WHERE title CONTAINS ? ALLOW FILTERING LIMIT ?`,
            [searchTerm, limit]
        )
    ]);

    // Group posts by category
    const postsByCategory = new Map();
    postsPromise.rows.forEach(post => {
        if (!postsByCategory.has(post.category_id)) {
            postsByCategory.set(post.category_id, []);
        }
        postsByCategory.get(post.category_id).push(post);
    });

    return {
        categories: categoriesPromise.rows,
        posts_by_category: Object.fromEntries(postsByCategory),
        total_categories: categoriesPromise.rows.length,
        total_posts: postsPromise.rows.length
    };
}
```

---

## 📊 Pattern 4: Aggregation Across Tables

### Ví dụ: Categories với Statistics từ Multiple Tables

```javascript
// models/Category.js
async getCategoriesWithStats() {
    // 1. Lấy tất cả categories
    const categories = await this.findAll();

    // 2. Lấy statistics cho mỗi category từ multiple tables
    const categoriesWithStats = await Promise.all(
        categories.map(async (category) => {
            const [postsCount, recentPosts, topUsers] = await Promise.all([
                // Count từ posts_by_category
                this.getCategoryPostsCount(category.id),

                // Recent posts từ posts_by_category
                this.getCategoryPosts(category.id, 5),

                // Top users từ posts_by_category + user_profiles
                this.getCategoryTopUsers(category.id, 3)
            ]);

            return {
                ...category,
                statistics: {
                    actual_posts_count: postsCount,
                    recent_posts: recentPosts,
                    top_contributors: topUsers,
                    last_activity: recentPosts[0]?.created_at || null
                }
            };
        })
    );

    // Sort theo activity
    return categoriesWithStats.sort((a, b) =>
        b.statistics.actual_posts_count - a.statistics.actual_posts_count
    );
}
```

### User Activity Summary (4 Tables):

```javascript
// Aggregation từ 4 tables khác nhau
async getUserActivitySummary(userId, days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Query 4 tables parallel
    const [postsResult, commentsResult, likesResult, activitiesResult] = await Promise.all([
        // 1. posts_by_user table
        client.execute(
            `SELECT COUNT(*) as posts_count FROM posts_by_user
             WHERE user_id = ? AND year = ? AND created_at >= ? ALLOW FILTERING`,
            [userId, new Date().getFullYear(), fromDate]
        ),

        // 2. comments table
        client.execute(
            `SELECT COUNT(*) as comments_count FROM comments
             WHERE user_id = ? AND created_at >= ? ALLOW FILTERING`,
            [userId, fromDate]
        ),

        // 3. post_likes table
        client.execute(
            `SELECT COUNT(*) as likes_count FROM post_likes
             WHERE user_id = ? AND created_at >= ? ALLOW FILTERING`,
            [userId, fromDate]
        ),

        // 4. user_activity_feed table
        client.execute(
            `SELECT activity_type, COUNT(*) as count FROM user_activity_feed
             WHERE user_id = ? AND activity_time >= ?
             GROUP BY activity_type ALLOW FILTERING`,
            [userId, fromDate]
        )
    ]);

    return {
        period_days: days,
        posts_count: parseInt(postsResult.rows[0]?.posts_count) || 0,
        comments_count: parseInt(commentsResult.rows[0]?.comments_count) || 0,
        likes_given: parseInt(likesResult.rows[0]?.likes_count) || 0,
        activities_by_type: this.parseActivityTypes(activitiesResult.rows)
    };
}
```

---

## 🚀 Chạy Các Ví dụ

### 1. Setup Advanced Schemas

```bash
# Tạo advanced tables
npm run init-advanced
```

### 2. Chạy Multi-Table Demo

```bash
# Demo đầy đủ các patterns
npm run demo-advanced
```

### 3. Test qua API

```bash
# User profile từ 4 tables
curl "http://localhost:3000/api/advanced/users/{user-id}/profile?postsLimit=5"

# Category với posts và stats
curl "http://localhost:3000/api/advanced/categories/{category-id}/details"

# Cross-table search
curl "http://localhost:3000/api/advanced/search?q=cassandra"

# Analytics từ multiple tables
curl "http://localhost:3000/api/advanced/analytics/overview"
```

---

## 💡 Key Points về Multi-Table Queries trong Cassandra

### ✅ Được khuyến nghị:

1. **Application-level joins** - Kết hợp data ở application layer
2. **Parallel queries** - Query multiple tables cùng lúc
3. **Denormalization** - Duplicate data để optimize reads
4. **Prepared statements** - Tăng performance
5. **Counter columns** - Real-time aggregation

### ❌ Tránh:

1. **Sequential queries** - Khi có thể làm parallel
2. **JOIN operations** - Cassandra không support
3. **ALLOW FILTERING** - Trừ khi thật sự cần thiết
4. **Large result sets** - Always use LIMIT
5. **Complex WHERE clauses** - Design schema cho query patterns

### 🎯 Khi nào sử dụng:

- **Social media apps** - User profiles, activity feeds, relationships
- **Content platforms** - Categories, posts, comments, likes
- **E-commerce** - Products, categories, reviews, users
- **Analytics dashboards** - Real-time stats từ multiple sources
- **IoT applications** - Device data với relationships

---

**Happy querying multiple tables! 🚀**
