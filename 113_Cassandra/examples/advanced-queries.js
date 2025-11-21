/**
 * Advanced Multi-Table Queries Examples for Cassandra + Node.js
 * Demonstrate complex patterns như denormalization, aggregation, batch operations
 * Chạy: node examples/advanced-queries.js
 */

const database = require('../config/database');
const UserProfile = require('../models/UserProfile');
const Category = require('../models/Category');
const AdvancedPost = require('../models/AdvancedPost');

class AdvancedQueriesDemo {
    constructor() {
        this.createdData = {
            users: [],
            categories: [],
            posts: []
        };
    }

    async run() {
        console.log('🚀 Advanced Multi-Table Queries Demo\n');

        try {
            await database.connect();

            // Setup demo data
            await this.setupDemoData();

            // 1. Denormalization Examples
            console.log('\n=== 1. DENORMALIZATION PATTERNS ===');
            await this.demonstrateDenormalization();

            // 2. Multi-Table Queries
            console.log('\n=== 2. MULTI-TABLE QUERIES ===');
            await this.demonstrateMultiTableQueries();

            // 3. Aggregation Patterns
            console.log('\n=== 3. AGGREGATION PATTERNS ===');
            await this.demonstrateAggregations();

            // 4. Batch Operations
            console.log('\n=== 4. BATCH OPERATIONS ===');
            await this.demonstrateBatchOperations();

            // 5. Complex Relationships
            console.log('\n=== 5. COMPLEX RELATIONSHIPS ===');
            await this.demonstrateComplexRelationships();

            // 6. Performance Patterns
            console.log('\n=== 6. PERFORMANCE PATTERNS ===');
            await this.demonstratePerformancePatterns();

            console.log('\n🎉 Advanced queries demo completed!');

        } catch (error) {
            console.error('❌ Demo failed:', error);
        } finally {
            // Cleanup
            await this.cleanup();
            await database.disconnect();
        }
    }

    async setupDemoData() {
        console.log('📝 Setting up demo data...');

        try {
            // Tạo categories
            const categories = await Promise.all([
                Category.create({
                    name: 'Technology',
                    description: 'Tech articles and tutorials'
                }),
                Category.create({
                    name: 'Lifestyle',
                    description: 'Lifestyle and personal blogs'
                }),
                Category.create({
                    name: 'Business',
                    description: 'Business and entrepreneurship'
                })
            ]);

            this.createdData.categories = categories;

            // Tạo users
            const users = await Promise.all([
                UserProfile.create({
                    email: 'tech.blogger@example.com',
                    name: 'Tech Blogger',
                    bio: 'Passionate about technology',
                    location: 'San Francisco'
                }),
                UserProfile.create({
                    email: 'lifestyle.guru@example.com',
                    name: 'Lifestyle Guru',
                    bio: 'Living life to the fullest',
                    location: 'New York'
                }),
                UserProfile.create({
                    email: 'biz.expert@example.com',
                    name: 'Business Expert',
                    bio: 'Helping startups succeed',
                    location: 'Austin'
                })
            ]);

            this.createdData.users = users;

            // Tạo follow relationships
            await UserProfile.followUser(users[1].user_id, users[0].user_id); // Lifestyle follows Tech
            await UserProfile.followUser(users[2].user_id, users[0].user_id); // Business follows Tech
            await UserProfile.followUser(users[0].user_id, users[2].user_id); // Tech follows Business

            console.log('✅ Demo data created');
            console.log(`   - ${categories.length} categories`);
            console.log(`   - ${users.length} users`);
            console.log(`   - Follow relationships established`);

        } catch (error) {
            console.error('❌ Error setting up demo data:', error);
            throw error;
        }
    }

    async demonstrateDenormalization() {
        console.log('\n🔄 Denormalization Patterns Demo:');

        try {
            const user = this.createdData.users[0];
            const category = this.createdData.categories[0];

            console.log('1. Creating post with denormalized data across multiple tables...');

            // Tạo post sẽ được denormalized vào multiple tables
            const post = await AdvancedPost.createAdvancedPost({
                user_id: user.user_id,
                category_id: category.id,
                title: 'Advanced Cassandra Patterns',
                content: 'This post demonstrates advanced patterns in Cassandra including denormalization, materialized views simulation, and multi-table consistency.',
                tags: ['cassandra', 'database', 'nosql', 'patterns']
            });

            this.createdData.posts.push(post);

            console.log('✅ Post created and denormalized to:');
            console.log('   - posts (main table)');
            console.log('   - posts_by_category (materialized view pattern)');
            console.log('   - posts_by_user (time-series pattern)');
            console.log('   - user_activity_feed (activity stream)');
            console.log('   - Updated counters in user_profiles and categories');
            console.log('   - Updated tag_statistics');

            console.log('\n2. Fetching post with all relationships...');
            const fullPost = await AdvancedPost.getPostById(post.id);

            console.log('✅ Retrieved post with:');
            console.log(`   - Author: ${fullPost.author?.name}`);
            console.log(`   - Category: ${fullPost.category?.name}`);
            console.log(`   - Tags: ${fullPost.tags?.join(', ')}`);

        } catch (error) {
            console.error('❌ Denormalization demo failed:', error);
        }
    }

    async demonstrateMultiTableQueries() {
        console.log('\n🔗 Multi-Table Queries Demo:');

        try {
            const user = this.createdData.users[0];
            const category = this.createdData.categories[0];

            console.log('1. User profile with complete details (4 table joins)...');
            const profileWithDetails = await UserProfile.getProfileWithDetails(user.user_id, {
                postsLimit: 5,
                followersLimit: 10,
                followingLimit: 10
            });

            console.log('✅ Profile loaded with data from:');
            console.log(`   - User Profile: ${profileWithDetails.name}`);
            console.log(`   - Recent Posts: ${profileWithDetails.recent_posts?.length || 0} posts`);
            console.log(`   - Followers: ${profileWithDetails.followers?.length || 0} followers`);
            console.log(`   - Following: ${profileWithDetails.following?.length || 0} following`);

            console.log('\n2. Category with posts and statistics...');
            const categoryWithPosts = await Category.getCategoryWithPosts(category.id, {
                postsLimit: 10,
                tagsLimit: 5
            });

            console.log('✅ Category loaded with:');
            console.log(`   - Category: ${categoryWithPosts.name}`);
            console.log(`   - Posts: ${categoryWithPosts.posts?.length || 0} posts`);
            console.log(`   - Top Tags: ${categoryWithPosts.top_tags?.map(t => t.tag).join(', ')}`);

            console.log('\n3. Cross-category search (2 table search)...');
            const searchResults = await Category.searchCategoriesAndPosts('Cassandra', 20);

            console.log('✅ Search results:');
            console.log(`   - Categories found: ${searchResults.total_categories}`);
            console.log(`   - Posts found: ${searchResults.total_posts}`);

        } catch (error) {
            console.error('❌ Multi-table queries demo failed:', error);
        }
    }

    async demonstrateAggregations() {
        console.log('\n📊 Aggregation Patterns Demo:');

        try {
            console.log('1. Categories with statistics aggregation...');
            const categoriesWithStats = await Category.getCategoriesWithStats();

            console.log('✅ Categories ranked by activity:');
            categoriesWithStats.forEach((cat, index) => {
                console.log(`   ${index + 1}. ${cat.name}: ${cat.actual_posts_count} posts`);
            });

            console.log('\n2. Hot posts aggregation (engagement-based)...');
            const hotPosts = await AdvancedPost.getHotPosts(null, 5);

            console.log('✅ Top engaging posts:');
            hotPosts.forEach((post, index) => {
                console.log(`   ${index + 1}. "${post.title}" - Score: ${post.engagement_score}`);
            });

            console.log('\n3. User activity summary aggregation...');
            const user = this.createdData.users[0];
            const activitySummary = await AdvancedPost.getUserActivitySummary(user.user_id, 30);

            console.log('✅ User activity (last 30 days):');
            console.log(`   - Posts: ${activitySummary.posts_count}`);
            console.log(`   - Comments: ${activitySummary.comments_count}`);
            console.log(`   - Likes given: ${activitySummary.likes_given}`);
            console.log(`   - Total activities: ${activitySummary.total_activities}`);

            console.log('\n4. Trending tags aggregation...');
            const trendingTags = await AdvancedPost.getTrendingTags(10);

            console.log('✅ Trending tags:');
            trendingTags.forEach((tag, index) => {
                console.log(`   ${index + 1}. #${tag.tag}: ${tag.posts_count} posts`);
            });

        } catch (error) {
            console.error('❌ Aggregations demo failed:', error);
        }
    }

    async demonstrateBatchOperations() {
        console.log('\n⚡ Batch Operations Demo:');

        try {
            const [user1, user2] = this.createdData.users;
            const post = this.createdData.posts[0];

            console.log('1. Batch follow/unfollow operations...');

            // Follow operation với batch updates
            await UserProfile.followUser(user2.user_id, user1.user_id);
            console.log(`✅ ${user2.name} followed ${user1.name} (4 table updates in batch)`);

            // Unfollow operation với batch updates
            await UserProfile.unfollowUser(user2.user_id, user1.user_id);
            console.log(`✅ ${user2.name} unfollowed ${user1.name} (4 table updates in batch)`);

            console.log('\n2. Batch like operation with denormalization...');
            await AdvancedPost.likePost(post.id, user2.user_id);
            console.log('✅ Post liked with batch updates to:');
            console.log('   - post_likes table');
            console.log('   - posts_by_category counters');
            console.log('   - user_activity_feed');

            console.log('\n3. Batch comment operation...');
            await AdvancedPost.addComment(post.id, {
                user_id: user2.user_id,
                content: 'Great article about Cassandra patterns!',
                category_id: this.createdData.categories[0].id,
                post_created_at: post.created_at,
                post_user_id: post.user_id
            });
            console.log('✅ Comment added with batch updates to:');
            console.log('   - comments table');
            console.log('   - posts_by_category counters');
            console.log('   - posts_by_user counters');
            console.log('   - user_activity_feed');

        } catch (error) {
            console.error('❌ Batch operations demo failed:', error);
        }
    }

    async demonstrateComplexRelationships() {
        console.log('\n🕸️ Complex Relationships Demo:');

        try {
            console.log('1. Many-to-many relationships (User following)...');

            const user1 = this.createdData.users[0];

            // Lấy followers và following
            const [followers, following] = await Promise.all([
                UserProfile.getUserFollowers(user1.user_id, 10),
                UserProfile.getUserFollowing(user1.user_id, 10)
            ]);

            console.log('✅ Relationship mapping:');
            console.log(`   - ${user1.name} has ${followers.length} followers`);
            console.log(`   - ${user1.name} follows ${following.length} users`);

            followers.forEach(follower => {
                console.log(`     👤 Followed by: ${follower.follower_name}`);
            });

            console.log('\n2. Hierarchical data simulation (Categories -> Posts -> Comments)...');

            const category = this.createdData.categories[0];
            const categoryWithPosts = await Category.getCategoryWithPosts(category.id);

            console.log(`✅ Category hierarchy: ${category.name}`);

            if (categoryWithPosts.posts && categoryWithPosts.posts.length > 0) {
                for (const post of categoryWithPosts.posts.slice(0, 2)) {
                    const comments = await AdvancedPost.getPostComments(post.post_id, 5);
                    console.log(`   📝 Post: "${post.title}"`);
                    console.log(`      💬 ${comments.length} comments`);

                    comments.forEach(comment => {
                        console.log(`        - ${comment.user_name}: ${comment.content.substring(0, 50)}...`);
                    });
                }
            }

        } catch (error) {
            console.error('❌ Complex relationships demo failed:', error);
        }
    }

    async demonstratePerformancePatterns() {
        console.log('\n🚄 Performance Patterns Demo:');

        try {
            console.log('1. Time-series pattern (posts_by_user by year)...');

            const user = this.createdData.users[0];
            const currentYear = new Date().getFullYear();

            const userPosts = await UserProfile.getUserRecentPosts(user.user_id, 10);
            console.log(`✅ Time-series query: Found ${userPosts.length} posts for ${currentYear}`);

            console.log('\n2. Counter columns performance...');

            const profile = await UserProfile.findById(user.user_id);
            console.log('✅ Counter values (O(1) reads):');
            console.log(`   - Posts count: ${profile.posts_count || 0}`);
            console.log(`   - Followers count: ${profile.followers_count || 0}`);
            console.log(`   - Following count: ${profile.following_count || 0}`);

            console.log('\n3. Materialized view pattern (posts_by_category)...');

            const category = this.createdData.categories[0];
            const start = Date.now();
            const categoryPosts = await Category.getCategoryPosts(category.id, 20);
            const elapsed = Date.now() - start;

            console.log(`✅ Materialized view query: ${categoryPosts.length} posts in ${elapsed}ms`);

            console.log('\n4. Parallel queries pattern...');

            const parallelStart = Date.now();
            const [allCategories, allUsers, hotPosts] = await Promise.all([
                Category.findAll(10),
                UserProfile.searchUsersWithStats({}),
                AdvancedPost.getHotPosts(null, 10)
            ]);
            const parallelElapsed = Date.now() - parallelStart;

            console.log(`✅ 3 parallel queries completed in ${parallelElapsed}ms:`);
            console.log(`   - Categories: ${allCategories.length}`);
            console.log(`   - Users: ${allUsers.length}`);
            console.log(`   - Hot posts: ${hotPosts.length}`);

        } catch (error) {
            console.error('❌ Performance patterns demo failed:', error);
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up demo data...');

        try {
            const client = database.getClient();

            // Delete posts
            for (const post of this.createdData.posts) {
                if (post && post.id) {
                    await client.execute('DELETE FROM posts WHERE id = ?', [post.id]);
                    await client.execute('DELETE FROM posts_by_category WHERE post_id = ? IF EXISTS', [post.id]);
                    await client.execute('DELETE FROM posts_by_user WHERE post_id = ? IF EXISTS', [post.id]);
                    await client.execute('DELETE FROM comments WHERE post_id = ?', [post.id]);
                    await client.execute('DELETE FROM post_likes WHERE post_id = ?', [post.id]);
                }
            }

            // Delete users
            for (const user of this.createdData.users) {
                if (user && user.user_id) {
                    await client.execute('DELETE FROM user_profiles WHERE user_id = ?', [user.user_id]);
                    await client.execute('DELETE FROM user_followers WHERE user_id = ?', [user.user_id]);
                    await client.execute('DELETE FROM user_followers WHERE follower_id = ?', [user.user_id]);
                    await client.execute('DELETE FROM user_following WHERE follower_id = ?', [user.user_id]);
                    await client.execute('DELETE FROM user_following WHERE user_id = ?', [user.user_id]);
                    await client.execute('DELETE FROM user_activity_feed WHERE user_id = ?', [user.user_id]);
                }
            }

            // Delete categories
            for (const category of this.createdData.categories) {
                if (category && category.id) {
                    await client.execute('DELETE FROM categories WHERE id = ?', [category.id]);
                }
            }

            console.log('✅ Demo data cleaned up');

        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// Chạy demo nếu file được gọi trực tiếp
if (require.main === module) {
    const demo = new AdvancedQueriesDemo();
    demo.run().catch(console.error);
}

module.exports = AdvancedQueriesDemo;
