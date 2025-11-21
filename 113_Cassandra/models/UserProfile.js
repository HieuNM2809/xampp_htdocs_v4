const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UserProfile {
    constructor() {
        this.tableName = 'user_profiles';
    }

    // Tạo user profile với denormalized data
    async create(profileData) {
        const client = database.getClient();
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO ${this.tableName} (
                user_id, email, name, bio, avatar_url, location, website, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            profileData.email,
            profileData.name,
            profileData.bio || null,
            profileData.avatar_url || null,
            profileData.location || null,
            profileData.website || null,
            now,
            now
        ];

        try {
            await client.execute(query, params, { prepare: true });
            return this.findById(id);
        } catch (error) {
            console.error('Lỗi khi tạo user profile:', error);
            throw error;
        }
    }

    // Lấy user profile với aggregated counters
    async findById(userId) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;

        try {
            const result = await client.execute(query, [userId], { prepare: true });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi tìm user profile:', error);
            throw error;
        }
    }

    // Cập nhật counters (followers, following, posts)
    async updateCounters(userId, counterUpdates) {
        const client = database.getClient();

        const updateClauses = [];
        const params = [];

        if (counterUpdates.followers_count !== undefined) {
            updateClauses.push('followers_count = followers_count + ?');
            params.push(counterUpdates.followers_count);
        }

        if (counterUpdates.following_count !== undefined) {
            updateClauses.push('following_count = following_count + ?');
            params.push(counterUpdates.following_count);
        }

        if (counterUpdates.posts_count !== undefined) {
            updateClauses.push('posts_count = posts_count + ?');
            params.push(counterUpdates.posts_count);
        }

        if (updateClauses.length === 0) {
            throw new Error('Không có counter nào để cập nhật');
        }

        params.push(userId);

        const query = `
            UPDATE ${this.tableName}
            SET ${updateClauses.join(', ')}
            WHERE user_id = ?
        `;

        try {
            await client.execute(query, params, { prepare: true });
            return this.findById(userId);
        } catch (error) {
            console.error('Lỗi khi cập nhật counters:', error);
            throw error;
        }
    }

    // Multi-table query: Lấy user với posts và followers
    async getProfileWithDetails(userId, options = {}) {
        const client = database.getClient();

        try {
            // 1. Lấy thông tin user profile
            const profilePromise = this.findById(userId);

            // 2. Lấy posts gần đây của user
            const postsPromise = this.getUserRecentPosts(userId, options.postsLimit || 10);

            // 3. Lấy followers gần đây
            const followersPromise = this.getUserFollowers(userId, options.followersLimit || 20);

            // 4. Lấy following
            const followingPromise = this.getUserFollowing(userId, options.followingLimit || 20);

            // Chạy parallel queries
            const [profile, posts, followers, following] = await Promise.all([
                profilePromise,
                postsPromise,
                followersPromise,
                followingPromise
            ]);

            if (!profile) {
                return null;
            }

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

        } catch (error) {
            console.error('Lỗi khi lấy profile details:', error);
            throw error;
        }
    }

    // Helper: Lấy posts gần đây của user
    async getUserRecentPosts(userId, limit = 10) {
        const client = database.getClient();
        const currentYear = new Date().getFullYear();

        const query = `
            SELECT post_id, title, content, tags, likes_count, comments_count, created_at
            FROM posts_by_user
            WHERE user_id = ? AND year = ?
            LIMIT ?
        `;

        try {
            const result = await client.execute(query, [userId, currentYear, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy user posts:', error);
            return [];
        }
    }

    // Helper: Lấy followers
    async getUserFollowers(userId, limit = 20) {
        const client = database.getClient();

        const query = `
            SELECT follower_id, follower_name, follower_avatar, created_at
            FROM user_followers
            WHERE user_id = ?
            LIMIT ?
        `;

        try {
            const result = await client.execute(query, [userId, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy followers:', error);
            return [];
        }
    }

    // Helper: Lấy following
    async getUserFollowing(userId, limit = 20) {
        const client = database.getClient();

        const query = `
            SELECT user_id, user_name, user_avatar, created_at
            FROM user_following
            WHERE follower_id = ?
            LIMIT ?
        `;

        try {
            const result = await client.execute(query, [userId, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy following:', error);
            return [];
        }
    }

    // Complex query: Search users với multiple conditions
    async searchUsersWithStats(searchCriteria) {
        const client = database.getClient();

        try {
            let query = `SELECT * FROM ${this.tableName}`;
            const conditions = [];
            const params = [];

            // Note: Trong production, bạn cần tạo indexes phù hợp hoặc sử dụng search engine như Elasticsearch

            if (searchCriteria.location) {
                conditions.push('location = ?');
                params.push(searchCriteria.location);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')} ALLOW FILTERING`;
            }

            if (searchCriteria.limit) {
                query += ` LIMIT ?`;
                params.push(searchCriteria.limit);
            }

            const result = await client.execute(query, params, { prepare: true });
            return result.rows;

        } catch (error) {
            console.error('Lỗi khi search users:', error);
            throw error;
        }
    }

    // Batch operation: Follow user với denormalization
    async followUser(followerId, targetUserId) {
        const client = database.getClient();

        try {
            // Lấy thông tin cần thiết
            const [followerProfile, targetProfile] = await Promise.all([
                this.findById(followerId),
                this.findById(targetUserId)
            ]);

            if (!followerProfile || !targetProfile) {
                throw new Error('User không tồn tại');
            }

            const now = new Date();

            // Batch queries để maintain consistency
            const batch = [
                {
                    query: `INSERT INTO user_followers (user_id, follower_id, follower_name, follower_avatar, created_at) VALUES (?, ?, ?, ?, ?)`,
                    params: [targetUserId, followerId, followerProfile.name, followerProfile.avatar_url, now]
                },
                {
                    query: `INSERT INTO user_following (follower_id, user_id, user_name, user_avatar, created_at) VALUES (?, ?, ?, ?, ?)`,
                    params: [followerId, targetUserId, targetProfile.name, targetProfile.avatar_url, now]
                },
                {
                    query: `UPDATE ${this.tableName} SET followers_count = followers_count + 1 WHERE user_id = ?`,
                    params: [targetUserId]
                },
                {
                    query: `UPDATE ${this.tableName} SET following_count = following_count + 1 WHERE user_id = ?`,
                    params: [followerId]
                }
            ];

            await client.batch(batch, { prepare: true });

            return {
                success: true,
                message: `${followerProfile.name} đã follow ${targetProfile.name}`
            };

        } catch (error) {
            console.error('Lỗi khi follow user:', error);
            throw error;
        }
    }

    // Unfollow user
    async unfollowUser(followerId, targetUserId) {
        const client = database.getClient();

        try {
            const batch = [
                {
                    query: `DELETE FROM user_followers WHERE user_id = ? AND follower_id = ?`,
                    params: [targetUserId, followerId]
                },
                {
                    query: `DELETE FROM user_following WHERE follower_id = ? AND user_id = ?`,
                    params: [followerId, targetUserId]
                },
                {
                    query: `UPDATE ${this.tableName} SET followers_count = followers_count - 1 WHERE user_id = ?`,
                    params: [targetUserId]
                },
                {
                    query: `UPDATE ${this.tableName} SET following_count = following_count - 1 WHERE user_id = ?`,
                    params: [followerId]
                }
            ];

            await client.batch(batch, { prepare: true });

            return {
                success: true,
                message: 'Unfollow thành công'
            };

        } catch (error) {
            console.error('Lỗi khi unfollow user:', error);
            throw error;
        }
    }
}

module.exports = new UserProfile();
