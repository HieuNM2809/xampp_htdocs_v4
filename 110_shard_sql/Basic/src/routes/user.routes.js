const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');

// Lấy tất cả người dùng
router.get('/', async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Lấy người dùng theo ID
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Tạo người dùng mới
router.post('/', async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Cập nhật người dùng
router.put('/:userId', async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.userId, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Xóa người dùng
router.delete('/:userId', async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
