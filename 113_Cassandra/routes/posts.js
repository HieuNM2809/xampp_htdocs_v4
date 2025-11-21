const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');

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

// GET /api/posts - Lấy danh sách posts
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const posts = await Post.findAll(limit);
        res.json({
            success: true,
            data: posts,
            count: posts.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/posts/:id - Lấy post theo ID
router.get('/:id', validateUUID, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
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

// GET /api/posts/user/:userId - Lấy posts theo user ID
router.get('/user/:userId', validateUUID, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const posts = await Post.findByUserId(req.params.userId, limit);
        res.json({
            success: true,
            data: posts,
            count: posts.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/posts/tag/:tag - Lấy posts theo tag
router.get('/tag/:tag', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const posts = await Post.findByTag(req.params.tag, limit);
        res.json({
            success: true,
            data: posts,
            count: posts.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// POST /api/posts - Tạo post mới
router.post('/', async (req, res) => {
    try {
        const { user_id, title, content, tags } = req.body;

        // Validate dữ liệu
        if (!user_id || !title || !content) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'user_id, title và content là bắt buộc'
            });
        }

        // Kiểm tra user tồn tại
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'User không tồn tại'
            });
        }

        const postData = { user_id, title, content };
        if (tags && Array.isArray(tags)) {
            postData.tags = tags;
        }

        const post = await Post.create(postData);
        res.status(201).json({
            success: true,
            data: post,
            message: 'Tạo post thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// PUT /api/posts/:id - Cập nhật post
router.put('/:id', validateUUID, async (req, res) => {
    try {
        const { title, content, tags } = req.body;

        // Kiểm tra post tồn tại
        const existingPost = await Post.findById(req.params.id);
        if (!existingPost) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'Post không tồn tại'
            });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (tags !== undefined && Array.isArray(tags)) updateData.tags = tags;

        const post = await Post.updateById(req.params.id, updateData);
        res.json({
            success: true,
            data: post,
            message: 'Cập nhật post thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// DELETE /api/posts/:id - Xóa post
router.delete('/:id', validateUUID, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'Post không tồn tại'
            });
        }

        await Post.deleteById(req.params.id);
        res.json({
            success: true,
            message: 'Xóa post thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// POST /api/posts/:id/tags - Thêm tag vào post
router.post('/:id/tags', validateUUID, async (req, res) => {
    try {
        const { tag } = req.body;

        if (!tag) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'Tag là bắt buộc'
            });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'Post không tồn tại'
            });
        }

        const updatedPost = await Post.addTag(req.params.id, tag);
        res.json({
            success: true,
            data: updatedPost,
            message: 'Thêm tag thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// DELETE /api/posts/:id/tags/:tag - Xóa tag khỏi post
router.delete('/:id/tags/:tag', validateUUID, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'Post không tồn tại'
            });
        }

        const updatedPost = await Post.removeTag(req.params.id, req.params.tag);
        res.json({
            success: true,
            data: updatedPost,
            message: 'Xóa tag thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

module.exports = router;

