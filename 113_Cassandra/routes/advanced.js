const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const Category = require('../models/Category');
const AdvancedPost = require('../models/AdvancedPost');

// Middleware để validate UUID
const validateUUID = (req, res, next) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (req.params.id && !uuidRegex.test(req.params.id)) {
        return res.status(400).json({
            error: 'ID không hợp lệ',
            message: 'ID phải là UUID hợp lệ'
        });
    }
    next();
};

// ===========================================
// USER PROFILE ADVANCED ROUTES
// ===========================================

// GET /api/advanced/users/:id/profile - Lấy user profile với full details
router.get('/users/:id/profile', validateUUID, async (req, res) => {
    try {
        const { postsLimit = 10, followersLimit = 20, followingLimit = 20 } = req.query;

        const profile = await UserProfile.getProfileWithDetails(req.params.id, {
            postsLimit: parseInt(postsLimit),
            followersLimit: parseInt(followersLimit),
            followingLimit: parseInt(followingLimit)
        });

        if (!profile) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'User profile không tồn tại'
            });
        }

        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// POST /api/advanced/users/:id/follow - Follow user với batch operations
router.post('/users/:id/follow', validateUUID, async (req, res) => {
    try {
        const { follower_id } = req.body;

        if (!follower_id) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'follower_id là bắt buộc'
            });
        }

        const result = await UserProfile.followUser(follower_id, req.params.id);

        res.json({
            success: true,
            data: result,
            message: 'Follow thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// DELETE /api/advanced/users/:id/follow - Unfollow user
router.delete('/users/:id/follow', validateUUID, async (req, res) => {
    try {
        const { follower_id } = req.body;

        if (!follower_id) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'follower_id là bắt buộc'
            });
        }

        const result = await UserProfile.unfollowUser(follower_id, req.params.id);

        res.json({
            success: true,
            data: result,
            message: 'Unfollow thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/advanced/users/search - Search users với multiple criteria
router.get('/users/search', async (req, res) => {
    try {
        const { location, limit = 50 } = req.query;

        const searchCriteria = {
            limit: parseInt(limit)
        };

        if (location) searchCriteria.location = location;

        const users = await UserProfile.searchUsersWithStats(searchCriteria);

        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/advanced/users/:id/activity - User activity summary
router.get('/users/:id/activity', validateUUID, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const activity = await AdvancedPost.getUserActivitySummary(req.params.id, parseInt(days));

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// ===========================================
// CATEGORY ADVANCED ROUTES
// ===========================================

// GET /api/advanced/categories/:id/details - Category với posts và statistics
router.get('/categories/:id/details', validateUUID, async (req, res) => {
    try {
        const { postsLimit = 20, tagsLimit = 10 } = req.query;

        const category = await Category.getCategoryWithPosts(req.params.id, {
            postsLimit: parseInt(postsLimit),
            tagsLimit: parseInt(tagsLimit)
        });

        if (!category) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'Category không tồn tại'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/advanced/categories/stats - All categories với statistics
router.get('/categories/stats', async (req, res) => {
    try {
        const categories = await Category.getCategoriesWithStats();

        res.json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/advanced/search - Cross-category search
router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm, limit = 50 } = req.query;

        if (!searchTerm) {
            return res.status(400).json({
                error: 'Thiếu tham số',
                message: 'Tham số q (search term) là bắt buộc'
            });
        }

        const results = await Category.searchCategoriesAndPosts(searchTerm, parseInt(limit));

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// ===========================================
// ADVANCED POST ROUTES
// ===========================================

// POST /api/advanced/posts - Tạo post với advanced denormalization
router.post('/posts', async (req, res) => {
    try {
        const { user_id, category_id, title, content, tags } = req.body;

        // Validate
        if (!user_id || !category_id || !title || !content) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'user_id, category_id, title và content là bắt buộc'
            });
        }

        const postData = { user_id, category_id, title, content };
        if (tags && Array.isArray(tags)) {
            postData.tags = tags;
        }

        const post = await AdvancedPost.createAdvancedPost(postData);

        res.status(201).json({
            success: true,
            data: post,
            message: 'Post tạo thành công với denormalization'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/advanced/posts/:id - Lấy post với full relationships
router.get('/posts/:id', validateUUID, async (req, res) => {
    try {
        const post = await AdvancedPost.getPostById(req.params.id);

        if (!post) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'Post không tồn tại'
            });
        }

        res.json({
            success: true,
            data: post
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// POST /api/advanced/posts/:id/like - Like post với batch operations
router.post('/posts/:id/like', validateUUID, async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'user_id là bắt buộc'
            });
        }

        const result = await AdvancedPost.likePost(req.params.id, user_id);

        res.json({
            success: true,
            data: result,
            message: 'Like thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// DELETE /api/advanced/posts/:id/like - Unlike post
router.delete('/posts/:id/like', validateUUID, async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'user_id là bắt buộc'
            });
        }

        const result = await AdvancedPost.unlikePost(req.params.id, user_id);

        res.json({
            success: true,
            data: result,
            message: 'Unlike thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// POST /api/advanced/posts/:id/comments - Thêm comment với denormalization
router.post('/posts/:id/comments', validateUUID, async (req, res) => {
    try {
        const { user_id, content, category_id, post_created_at, post_user_id } = req.body;

        if (!user_id || !content) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'user_id và content là bắt buộc'
            });
        }

        const commentData = {
            user_id,
            content,
            category_id: category_id || null,
            post_created_at: post_created_at ? new Date(post_created_at) : new Date(),
            post_user_id: post_user_id || null
        };

        const comment = await AdvancedPost.addComment(req.params.id, commentData);

        res.status(201).json({
            success: true,
            data: comment,
            message: 'Comment thêm thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// ===========================================
// AGGREGATION ROUTES
// ===========================================

// GET /api/advanced/posts/hot - Hot posts với engagement ranking
router.get('/posts/hot', async (req, res) => {
    try {
        const { category_id, limit = 20 } = req.query;

        const hotPosts = await AdvancedPost.getHotPosts(
            category_id || null,
            parseInt(limit)
        );

        res.json({
            success: true,
            data: hotPosts,
            count: hotPosts.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/advanced/tags/trending - Trending tags
router.get('/tags/trending', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const trendingTags = await AdvancedPost.getTrendingTags(parseInt(limit));

        res.json({
            success: true,
            data: trendingTags,
            count: trendingTags.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// ===========================================
// ANALYTICS ROUTES
// ===========================================

// GET /api/advanced/analytics/overview - Platform overview
router.get('/analytics/overview', async (req, res) => {
    try {
        // Parallel queries for analytics
        const [categories, hotPosts, trendingTags] = await Promise.all([
            Category.getCategoriesWithStats(),
            AdvancedPost.getHotPosts(null, 10),
            AdvancedPost.getTrendingTags(10)
        ]);

        const analytics = {
            categories: {
                total: categories.length,
                most_active: categories[0]?.name || 'N/A',
                total_posts: categories.reduce((sum, cat) => sum + (cat.actual_posts_count || 0), 0)
            },
            engagement: {
                hot_posts_count: hotPosts.length,
                avg_engagement: hotPosts.reduce((sum, post) => sum + (post.engagement_score || 0), 0) / hotPosts.length || 0
            },
            trends: {
                trending_tags: trendingTags.slice(0, 5).map(tag => tag.tag),
                most_used_tag: trendingTags[0]?.tag || 'N/A'
            }
        };

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

module.exports = router;
