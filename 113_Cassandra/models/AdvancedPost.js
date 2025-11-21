const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AdvancedPost {
    constructor() {
        this.postsTable = 'posts';
        this.postsByCategoryTable = 'posts_by_category';
        this.postsByUserTable = 'posts_by_user';
        this.commentsTable = 'comments';
        this.postLikesTable = 'post_likes';
        this.activityFeedTable = 'user_activity_feed';
    }

    // Tạo post với denormalization across multiple tables
    async createAdvancedPost(postData) {
        const client = database.getClient();
        const postId = uuidv4();
        const now = new Date();
        const year = now.getFullYear();

        try {
            // Validate required data
            if (!postData.user_id || !postData.category_id || !postData.title || !postData.content) {
                throw new Error('Thiếu thông tin bắt buộc: user_id, category_id, title, content');
            }

            // Lấy thông tin user để denormalize
            const UserProfile = require('./UserProfile');
            const Category = require('./Category');

            const [userProfile, category] = await Promise.all([
                UserProfile.findById(postData.user_id),
                Category.findById(postData.category_id)
            ]);

            if (!userProfile) throw new Error('User không tồn tại');
            if (!category) throw new Error('Category không tồn tại');

            // Batch insert vào multiple tables
            const batch = [
                // 1. Insert vào posts table chính
                {
                    query: `INSERT INTO ${this.postsTable} (id, user_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    params: [postId, postData.user_id, postData.title, postData.content, postData.tags || [], now, now]
                },

                // 2. Insert vào posts_by_category (materialized view pattern)
                {
                    query: `INSERT INTO ${this.postsByCategoryTable} (category_id, created_at, post_id, user_id, title, content, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    params: [postData.category_id, now, postId, postData.user_id, postData.title, postData.content, postData.tags || []]
                },

                // 3. Insert vào posts_by_user (time-series pattern)
                {
                    query: `INSERT INTO ${this.postsByUserTable} (user_id, year, created_at, post_id, category_id, title, content, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [postData.user_id, year, now, postId, postData.category_id, postData.title, postData.content, postData.tags || []]
                },

                // 4. Cập nhật counters
                {
                    query: `UPDATE user_profiles SET posts_count = posts_count + 1 WHERE user_id = ?`,
                    params: [postData.user_id]
                },

                // 5. Cập nhật category counter
                {
                    query: `UPDATE categories SET posts_count = posts_count + 1 WHERE id = ?`,
                    params: [postData.category_id]
                },

                // 6. Tạo activity feed entry
                {
                    query: `INSERT INTO ${this.activityFeedTable} (user_id, activity_time, activity_id, activity_type, post_id, post_title, content) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    params: [postData.user_id, now, uuidv4(), 'post', postId, postData.title, postData.content.substring(0, 200)]
                }
            ];

            await client.batch(batch, { prepare: true });

            // Cập nhật tag statistics nếu có tags
            if (postData.tags && postData.tags.length > 0) {
                await this.updateTagStatistics(postData.tags, 1);
            }

            return this.getPostById(postId);

        } catch (error) {
            console.error('Lỗi khi tạo advanced post:', error);
            throw error;
        }
    }

    // Lấy post với tất cả relationships
    async getPostById(postId) {
        const client = database.getClient();

        try {
            // 1. Lấy thông tin post chính
            const postPromise = client.execute(
                `SELECT * FROM ${this.postsTable} WHERE id = ?`,
                [postId],
                { prepare: true }
            );

            // 2. Lấy comments
            const commentsPromise = this.getPostComments(postId);

            // 3. Lấy likes
            const likesPromise = this.getPostLikes(postId);

            // Chạy parallel
            const [postResult, comments, likes] = await Promise.all([
                postPromise,
                commentsPromise,
                likesPromise
            ]);

            const post = postResult.rows[0];
            if (!post) return null;

            // 4. Lấy thông tin user và category
            const UserProfile = require('./UserProfile');
            const Category = require('./Category');

            const [userProfile, categoryInfo] = await Promise.all([
                UserProfile.findById(post.user_id),
                this.getPostCategory(postId)
            ]);

            return {
                ...post,
                author: userProfile,
                category: categoryInfo,
                comments: comments,
                likes: likes,
                stats: {
                    comments_count: comments.length,
                    likes_count: likes.length
                }
            };

        } catch (error) {
            console.error('Lỗi khi lấy post:', error);
            throw error;
        }
    }

    // Lấy category của post từ posts_by_category table
    async getPostCategory(postId) {
        const client = database.getClient();

        try {
            // Tìm trong posts_by_category
            const result = await client.execute(
                `SELECT category_id FROM ${this.postsByCategoryTable} WHERE post_id = ? LIMIT 1 ALLOW FILTERING`,
                [postId],
                { prepare: true }
            );

            if (result.rows.length === 0) return null;

            const Category = require('./Category');
            return await Category.findById(result.rows[0].category_id);

        } catch (error) {
            console.error('Lỗi khi lấy post category:', error);
            return null;
        }
    }

    // Lấy comments của post
    async getPostComments(postId, limit = 50) {
        const client = database.getClient();

        const query = `
            SELECT comment_id, user_id, user_name, user_avatar, content, created_at, updated_at
            FROM ${this.commentsTable}
            WHERE post_id = ?
            LIMIT ?
        `;

        try {
            const result = await client.execute(query, [postId, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy comments:', error);
            return [];
        }
    }

    // Lấy likes của post
    async getPostLikes(postId, limit = 100) {
        const client = database.getClient();

        const query = `
            SELECT user_id, user_name, created_at
            FROM ${this.postLikesTable}
            WHERE post_id = ?
            LIMIT ?
        `;

        try {
            const result = await client.execute(query, [postId, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy likes:', error);
            return [];
        }
    }

    // Thêm comment với denormalization
    async addComment(postId, commentData) {
        const client = database.getClient();
        const commentId = uuidv4();
        const now = new Date();

        try {
            // Lấy thông tin user
            const UserProfile = require('./UserProfile');
            const user = await UserProfile.findById(commentData.user_id);

            if (!user) throw new Error('User không tồn tại');

            // Batch operations
            const batch = [
                // 1. Insert comment
                {
                    query: `INSERT INTO ${this.commentsTable} (post_id, comment_id, user_id, user_name, user_avatar, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [postId, commentId, commentData.user_id, user.name, user.avatar_url, commentData.content, now, now]
                },

                // 2. Update counters in posts_by_category
                {
                    query: `UPDATE ${this.postsByCategoryTable} SET comments_count = comments_count + 1 WHERE post_id = ? AND category_id = ? AND created_at = ?`,
                    params: [postId, commentData.category_id, commentData.post_created_at] // Cần category_id và created_at để update
                },

                // 3. Update counter in posts_by_user
                {
                    query: `UPDATE ${this.postsByUserTable} SET comments_count = comments_count + 1 WHERE user_id = ? AND year = ? AND created_at = ? AND post_id = ?`,
                    params: [commentData.post_user_id, new Date().getFullYear(), commentData.post_created_at, postId]
                },

                // 4. Thêm vào activity feed
                {
                    query: `INSERT INTO ${this.activityFeedTable} (user_id, activity_time, activity_id, activity_type, post_id, content) VALUES (?, ?, ?, ?, ?, ?)`,
                    params: [commentData.user_id, now, uuidv4(), 'comment', postId, commentData.content.substring(0, 200)]
                }
            ];

            await client.batch(batch, { prepare: true });

            return {
                comment_id: commentId,
                user: user,
                content: commentData.content,
                created_at: now
            };

        } catch (error) {
            console.error('Lỗi khi thêm comment:', error);
            throw error;
        }
    }

    // Like post với denormalization
    async likePost(postId, userId) {
        const client = database.getClient();
        const now = new Date();

        try {
            // Kiểm tra đã like chưa
            const existingLike = await client.execute(
                `SELECT user_id FROM ${this.postLikesTable} WHERE post_id = ? AND user_id = ?`,
                [postId, userId],
                { prepare: true }
            );

            if (existingLike.rows.length > 0) {
                throw new Error('User đã like post này rồi');
            }

            // Lấy thông tin user
            const UserProfile = require('./UserProfile');
            const user = await UserProfile.findById(userId);

            if (!user) throw new Error('User không tồn tại');

            // Batch operations
            const batch = [
                // 1. Insert like
                {
                    query: `INSERT INTO ${this.postLikesTable} (post_id, user_id, user_name, created_at) VALUES (?, ?, ?, ?)`,
                    params: [postId, userId, user.name, now]
                },

                // 2. Update counter in posts_by_category (cần thông tin category)
                {
                    query: `UPDATE ${this.postsByCategoryTable} SET likes_count = likes_count + 1 WHERE post_id = ? IF EXISTS`,
                    params: [postId]
                },

                // 3. Activity feed
                {
                    query: `INSERT INTO ${this.activityFeedTable} (user_id, activity_time, activity_id, activity_type, post_id) VALUES (?, ?, ?, ?, ?)`,
                    params: [userId, now, uuidv4(), 'like', postId]
                }
            ];

            await client.batch(batch, { prepare: true });

            return {
                success: true,
                message: 'Like thành công'
            };

        } catch (error) {
            console.error('Lỗi khi like post:', error);
            throw error;
        }
    }

    // Unlike post
    async unlikePost(postId, userId) {
        const client = database.getClient();

        try {
            const batch = [
                {
                    query: `DELETE FROM ${this.postLikesTable} WHERE post_id = ? AND user_id = ?`,
                    params: [postId, userId]
                },
                {
                    query: `UPDATE ${this.postsByCategoryTable} SET likes_count = likes_count - 1 WHERE post_id = ? IF EXISTS`,
                    params: [postId]
                }
            ];

            await client.batch(batch, { prepare: true });

            return {
                success: true,
                message: 'Unlike thành công'
            };

        } catch (error) {
            console.error('Lỗi khi unlike post:', error);
            throw error;
        }
    }

    // Aggregation: Lấy posts hot (nhiều likes/comments gần đây)
    async getHotPosts(categoryId = null, limit = 20) {
        const client = database.getClient();

        try {
            let query = `SELECT * FROM ${this.postsByCategoryTable}`;
            let params = [];

            if (categoryId) {
                query += ` WHERE category_id = ?`;
                params.push(categoryId);
            }

            query += ` LIMIT ?`;
            params.push(limit * 2); // Lấy nhiều hơn để filter

            const result = await client.execute(query, params, { prepare: true });

            // Sort theo engagement score (likes + comments)
            const posts = result.rows
                .map(post => ({
                    ...post,
                    engagement_score: (post.likes_count || 0) + (post.comments_count || 0) * 2
                }))
                .sort((a, b) => b.engagement_score - a.engagement_score)
                .slice(0, limit);

            return posts;

        } catch (error) {
            console.error('Lỗi khi lấy hot posts:', error);
            throw error;
        }
    }

    // Complex aggregation: User activity summary
    async getUserActivitySummary(userId, days = 30) {
        const client = database.getClient();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        try {
            // 1. Lấy posts trong khoảng thời gian
            const postsPromise = client.execute(
                `SELECT COUNT(*) as posts_count FROM ${this.postsByUserTable} WHERE user_id = ? AND year = ? AND created_at >= ? ALLOW FILTERING`,
                [userId, new Date().getFullYear(), fromDate],
                { prepare: true }
            );

            // 2. Lấy comments trong khoảng thời gian
            const commentsPromise = client.execute(
                `SELECT COUNT(*) as comments_count FROM ${this.commentsTable} WHERE user_id = ? AND created_at >= ? ALLOW FILTERING`,
                [userId, fromDate],
                { prepare: true }
            );

            // 3. Lấy likes trong khoảng thời gian
            const likesPromise = client.execute(
                `SELECT COUNT(*) as likes_count FROM ${this.postLikesTable} WHERE user_id = ? AND created_at >= ? ALLOW FILTERING`,
                [userId, fromDate],
                { prepare: true }
            );

            // 4. Lấy activity feed
            const activitiesPromise = client.execute(
                `SELECT activity_type, COUNT(*) as count FROM ${this.activityFeedTable} WHERE user_id = ? AND activity_time >= ? GROUP BY activity_type ALLOW FILTERING`,
                [userId, fromDate],
                { prepare: true }
            );

            const [postsResult, commentsResult, likesResult, activitiesResult] = await Promise.all([
                postsPromise,
                commentsPromise,
                likesPromise,
                activitiesPromise
            ]);

            const activities = {};
            activitiesResult.rows.forEach(row => {
                activities[row.activity_type] = row.count;
            });

            return {
                period_days: days,
                posts_count: parseInt(postsResult.rows[0]?.posts_count) || 0,
                comments_count: parseInt(commentsResult.rows[0]?.comments_count) || 0,
                likes_given: parseInt(likesResult.rows[0]?.likes_count) || 0,
                activities_by_type: activities,
                total_activities: Object.values(activities).reduce((sum, count) => sum + count, 0)
            };

        } catch (error) {
            console.error('Lỗi khi lấy user activity summary:', error);
            throw error;
        }
    }

    // Update tag statistics (counter table pattern)
    async updateTagStatistics(tags, increment = 1) {
        const client = database.getClient();
        const now = new Date();

        try {
            const batch = tags.map(tag => ({
                query: `UPDATE tag_statistics SET posts_count = posts_count + ?, last_used = ? WHERE tag = ?`,
                params: [increment, now, tag]
            }));

            await client.batch(batch, { prepare: true });

        } catch (error) {
            console.error('Lỗi khi cập nhật tag statistics:', error);
            throw error;
        }
    }

    // Lấy trending tags
    async getTrendingTags(limit = 20) {
        const client = database.getClient();

        try {
            const result = await client.execute(
                `SELECT tag, posts_count, last_used FROM tag_statistics LIMIT ?`,
                [limit * 2],
                { prepare: true }
            );

            // Sort theo posts_count và recent activity
            const tags = result.rows
                .sort((a, b) => {
                    const scoreA = (a.posts_count || 0) * (a.last_used ? 1 : 0.5);
                    const scoreB = (b.posts_count || 0) * (b.last_used ? 1 : 0.5);
                    return scoreB - scoreA;
                })
                .slice(0, limit);

            return tags;

        } catch (error) {
            console.error('Lỗi khi lấy trending tags:', error);
            throw error;
        }
    }
}

module.exports = new AdvancedPost();
