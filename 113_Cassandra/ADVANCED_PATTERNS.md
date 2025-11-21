# 🚀 Advanced Cassandra Multi-Table Query Patterns

Hướng dẫn chi tiết về các patterns nâng cao trong Cassandra với Node.js để xử lý multi-table queries và relationships phức tạp.

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Denormalization Patterns](#-denormalization-patterns)
- [Multi-Table Queries](#-multi-table-queries)
- [Aggregation Patterns](#-aggregation-patterns)
- [Batch Operations](#-batch-operations)
- [Complex Relationships](#-complex-relationships)
- [Performance Optimization](#-performance-optimization)
- [API Examples](#-api-examples)

## 🎯 Tổng quan

Cassandra không hỗ trợ **JOINs** như SQL databases truyền thống. Thay vào đó, chúng ta sử dụng các patterns sau:

### 1. **Denormalization** - Lưu trữ dữ liệu trùng lặp
### 2. **Materialized Views** - Tạo views cho queries khác nhau
### 3. **Application-level Joins** - Kết hợp dữ liệu ở application layer
### 4. **Batch Operations** - Đảm bảo consistency
### 5. **Counter Columns** - Aggregation real-time

---

## 📊 Denormalization Patterns

### Pattern 1: Duplicate Data Across Tables

Thay vì normalize như SQL, chúng ta duplicate data để tối ưu reads:

```javascript
// Khi tạo post, chúng ta insert vào multiple tables
await AdvancedPost.createAdvancedPost({
    user_id: 'user-123',
    category_id: 'cat-456',
    title: 'Advanced Cassandra',
    content: 'Content...',
    tags: ['cassandra', 'nosql']
});

// Dữ liệu được denormalize vào:
// 1. posts (main table)
// 2. posts_by_category (query by category)
// 3. posts_by_user (query by user + time-series)
// 4. user_activity_feed (activity stream)
// 5. Counters updated in user_profiles & categories
```

### Schema Design:

```sql
-- Main posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY,
    user_id UUID,
    title TEXT,
    content TEXT,
    tags SET<TEXT>,
    created_at TIMESTAMP
);

-- Materialized view pattern - posts by category
CREATE TABLE posts_by_category (
    category_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    user_id UUID,    -- Denormalized
    title TEXT,      -- Denormalized
    content TEXT,    -- Denormalized
    tags SET<TEXT>,  -- Denormalized
    likes_count COUNTER,
    comments_count COUNTER,
    PRIMARY KEY (category_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Time-series pattern - posts by user
CREATE TABLE posts_by_user (
    user_id UUID,
    year INT,
    created_at TIMESTAMP,
    post_id UUID,
    category_id UUID,   -- Denormalized
    title TEXT,         -- Denormalized
    content TEXT,       -- Denormalized
    PRIMARY KEY ((user_id, year), created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

### Pattern 2: Counter Columns for Aggregation

```javascript
// Thay vì COUNT(*) queries, dùng counter columns
await UserProfile.updateCounters(userId, {
    followers_count: 1,    // +1 follower
    posts_count: 1        // +1 post
});

// O(1) read performance
const profile = await UserProfile.findById(userId);
console.log(`User có ${profile.posts_count} posts`);
```

---

## 🔗 Multi-Table Queries

### Pattern 1: Application-Level Joins

```javascript
// Lấy user profile với complete details từ 4 tables
async getProfileWithDetails(userId) {
    // Parallel queries
    const [profile, posts, followers, following] = await Promise.all([
        this.findById(userId),           // user_profiles table
        this.getUserRecentPosts(userId), // posts_by_user table
        this.getUserFollowers(userId),   // user_followers table
        this.getUserFollowing(userId)    // user_following table
    ]);

    return {
        ...profile,
        recent_posts: posts,
        followers: followers,
        following: following
    };
}
```

### Pattern 2: Cross-Table Search

```javascript
// Search across categories và posts
async searchCategoriesAndPosts(searchTerm) {
    const [categoriesResult, postsResult] = await Promise.all([
        // Search categories
        client.execute(
            `SELECT * FROM categories
             WHERE name CONTAINS ? ALLOW FILTERING`,
            [searchTerm]
        ),

        // Search posts
        client.execute(
            `SELECT category_id, post_id, title
             FROM posts_by_category
             WHERE title CONTAINS ? ALLOW FILTERING`,
            [searchTerm]
        )
    ]);

    // Group results by category
    return this.groupPostsByCategory(categoriesResult, postsResult);
}
```

---

## 📈 Aggregation Patterns

### Pattern 1: Real-time Counters

```sql
-- Counter columns cho real-time stats
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY,
    name TEXT,
    followers_count COUNTER,
    following_count COUNTER,
    posts_count COUNTER
);

-- Update counters khi có activity
UPDATE user_profiles
SET followers_count = followers_count + 1
WHERE user_id = ?;
```

### Pattern 2: Pre-computed Aggregations

```javascript
// Hot posts với engagement score
async getHotPosts(categoryId, limit) {
    const posts = await this.getCategoryPosts(categoryId, limit * 2);

    // Compute engagement score
    return posts
        .map(post => ({
            ...post,
            engagement_score: (post.likes_count || 0) + (post.comments_count || 0) * 2
        }))
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, limit);
}
```

### Pattern 3: Tag Statistics Table

```sql
CREATE TABLE tag_statistics (
    tag TEXT PRIMARY KEY,
    posts_count COUNTER,
    total_likes COUNTER,
    last_used TIMESTAMP
);
```

```javascript
// Update tag stats khi có post mới
async updateTagStatistics(tags) {
    const batch = tags.map(tag => ({
        query: `UPDATE tag_statistics
                SET posts_count = posts_count + 1, last_used = ?
                WHERE tag = ?`,
        params: [new Date(), tag]
    }));

    await client.batch(batch, { prepare: true });
}
```

---

## ⚡ Batch Operations

### Pattern 1: Atomic Multi-Table Updates

```javascript
// Follow user với consistency across tables
async followUser(followerId, targetUserId) {
    const batch = [
        // Insert vào user_followers
        {
            query: `INSERT INTO user_followers
                    (user_id, follower_id, follower_name, created_at)
                    VALUES (?, ?, ?, ?)`,
            params: [targetUserId, followerId, followerName, now]
        },

        // Insert vào user_following
        {
            query: `INSERT INTO user_following
                    (follower_id, user_id, user_name, created_at)
                    VALUES (?, ?, ?, ?)`,
            params: [followerId, targetUserId, targetName, now]
        },

        // Update counters
        {
            query: `UPDATE user_profiles
                    SET followers_count = followers_count + 1
                    WHERE user_id = ?`,
            params: [targetUserId]
        },

        {
            query: `UPDATE user_profiles
                    SET following_count = following_count + 1
                    WHERE user_id = ?`,
            params: [followerId]
        }
    ];

    await client.batch(batch, { prepare: true });
}
```

### Pattern 2: Activity Feed Updates

```javascript
// Like post với denormalization
async likePost(postId, userId) {
    const batch = [
        // Insert like
        {
            query: `INSERT INTO post_likes (post_id, user_id, created_at)
                    VALUES (?, ?, ?)`,
            params: [postId, userId, now]
        },

        // Update counters in multiple tables
        {
            query: `UPDATE posts_by_category
                    SET likes_count = likes_count + 1
                    WHERE post_id = ?`,
            params: [postId]
        },

        // Add to activity feed
        {
            query: `INSERT INTO user_activity_feed
                    (user_id, activity_time, activity_type, post_id)
                    VALUES (?, ?, ?, ?)`,
            params: [userId, now, 'like', postId]
        }
    ];

    await client.batch(batch, { prepare: true });
}
```

---

## 🕸️ Complex Relationships

### Pattern 1: Many-to-Many (User Following)

```sql
-- Bidirectional relationship tables
CREATE TABLE user_followers (
    user_id UUID,        -- Who is being followed
    follower_id UUID,    -- Who is following
    follower_name TEXT,  -- Denormalized
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, follower_id)
);

CREATE TABLE user_following (
    follower_id UUID,    -- Who is following
    user_id UUID,        -- Who is being followed
    user_name TEXT,      -- Denormalized
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, user_id)
);
```

### Pattern 2: Hierarchical Data (Category → Posts → Comments)

```javascript
// Category hierarchy với nested data
async getCategoryHierarchy(categoryId) {
    const category = await Category.findById(categoryId);
    const posts = await Category.getCategoryPosts(categoryId, 10);

    // Lấy comments cho mỗi post
    const postsWithComments = await Promise.all(
        posts.map(async post => ({
            ...post,
            comments: await AdvancedPost.getPostComments(post.post_id, 5)
        }))
    );

    return {
        ...category,
        posts: postsWithComments
    };
}
```

---

## 🚄 Performance Optimization

### Pattern 1: Time-Series Partitioning

```sql
-- Partition by year để tránh large partitions
CREATE TABLE posts_by_user (
    user_id UUID,
    year INT,           -- Partition key component
    created_at TIMESTAMP,
    post_id UUID,
    PRIMARY KEY ((user_id, year), created_at, post_id)
);
```

### Pattern 2: Parallel Queries

```javascript
// Chạy multiple queries parallel thay vì sequential
async getDashboardData(userId) {
    const [profile, recentPosts, hotPosts, trendingTags] = await Promise.all([
        UserProfile.findById(userId),
        AdvancedPost.getUserRecentPosts(userId, 10),
        AdvancedPost.getHotPosts(null, 20),
        AdvancedPost.getTrendingTags(10)
    ]);

    return { profile, recentPosts, hotPosts, trendingTags };
}
```

### Pattern 3: Prepared Statements

```javascript
// Always use prepared statements
await client.execute(query, params, { prepare: true });
```

---

## 🔧 API Examples

### Setup Advanced Schemas

```bash
# Tạo advanced schemas
npm run init-advanced

# Chạy advanced demo
npm run demo-advanced
```

### Advanced API Endpoints

```bash
# User profile với full details
GET /api/advanced/users/{id}/profile?postsLimit=10&followersLimit=20

# Follow user với batch operations
POST /api/advanced/users/{id}/follow
{
    "follower_id": "uuid"
}

# Category với posts và stats
GET /api/advanced/categories/{id}/details?postsLimit=20

# Cross-table search
GET /api/advanced/search?q=cassandra&limit=50

# Hot posts với engagement ranking
GET /api/advanced/posts/hot?category_id=uuid&limit=20

# User activity summary
GET /api/advanced/users/{id}/activity?days=30

# Trending tags
GET /api/advanced/tags/trending?limit=20

# Analytics overview
GET /api/advanced/analytics/overview
```

### Example: Create Advanced Post

```bash
curl -X POST http://localhost:3000/api/advanced/posts \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "category_id": "category-uuid",
    "title": "Advanced Cassandra Patterns",
    "content": "This demonstrates multi-table denormalization...",
    "tags": ["cassandra", "patterns", "nosql"]
  }'
```

### Example: Like Post with Batch Operations

```bash
curl -X POST http://localhost:3000/api/advanced/posts/{post-id}/like \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid"
  }'
```

---

## 📚 Key Takeaways

### ✅ Best Practices

1. **Denormalize aggressively** - Storage is cheap, reads should be fast
2. **Use counter columns** - For real-time aggregations
3. **Batch related operations** - Maintain consistency
4. **Parallel queries** - Don't do sequential when not needed
5. **Partition properly** - Avoid large partitions
6. **Prepare statements** - Better performance

### ❌ Anti-Patterns

1. **Don't normalize** - Như SQL databases
2. **Avoid ALLOW FILTERING** - Trừ khi thật sự cần thiết
3. **Don't create large partitions** - Partition by time/category
4. **Don't do sequential queries** - Khi có thể parallel
5. **Avoid hot partitions** - Distribute load evenly

### 🎯 When to Use These Patterns

- **Social media platforms** - User relationships, activity feeds
- **Content management** - Categories, posts, comments
- **E-commerce** - Product catalogs, user preferences
- **Analytics dashboards** - Real-time statistics
- **IoT applications** - Time-series data với relationships

---

**Chúc bạn thành công với Cassandra advanced patterns! 🚀**
