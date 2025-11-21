const express = require('express');
const router = express.Router();
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

// GET /api/users - Lấy danh sách users
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const users = await User.findAll(limit);
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

// GET /api/users/:id - Lấy user theo ID
router.get('/:id', validateUUID, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'User không tồn tại'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// GET /api/users/email/:email - Tìm user theo email
router.get('/email/:email', async (req, res) => {
    try {
        const user = await User.findByEmail(req.params.email);
        if (!user) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'User với email này không tồn tại'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// POST /api/users - Tạo user mới
router.post('/', async (req, res) => {
    try {
        const { email, name, age } = req.body;

        // Validate dữ liệu
        if (!email || !name) {
            return res.status(400).json({
                error: 'Thiếu thông tin',
                message: 'Email và tên là bắt buộc'
            });
        }

        // Kiểm tra email đã tồn tại
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'Trùng lặp',
                message: 'Email đã được sử dụng'
            });
        }

        const userData = { email, name };
        if (age !== undefined) userData.age = parseInt(age);

        const user = await User.create(userData);
        res.status(201).json({
            success: true,
            data: user,
            message: 'Tạo user thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// PUT /api/users/:id - Cập nhật user
router.put('/:id', validateUUID, async (req, res) => {
    try {
        const { email, name, age } = req.body;

        // Kiểm tra user tồn tại
        const existingUser = await User.findById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'User không tồn tại'
            });
        }

        // Kiểm tra email trùng lặp (nếu thay đổi email)
        if (email && email !== existingUser.email) {
            const duplicateUser = await User.findByEmail(email);
            if (duplicateUser) {
                return res.status(409).json({
                    error: 'Trùng lặp',
                    message: 'Email đã được sử dụng bởi user khác'
                });
            }
        }

        const updateData = {};
        if (email !== undefined) updateData.email = email;
        if (name !== undefined) updateData.name = name;
        if (age !== undefined) updateData.age = parseInt(age);

        const user = await User.updateById(req.params.id, updateData);
        res.json({
            success: true,
            data: user,
            message: 'Cập nhật user thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

// DELETE /api/users/:id - Xóa user
router.delete('/:id', validateUUID, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'Không tìm thấy',
                message: 'User không tồn tại'
            });
        }

        await User.deleteById(req.params.id);
        res.json({
            success: true,
            message: 'Xóa user thành công'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lỗi server',
            message: error.message
        });
    }
});

module.exports = router;

