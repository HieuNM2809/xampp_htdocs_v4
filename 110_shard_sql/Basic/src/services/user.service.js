const dbService = require('./db.service');
const crypto = require('crypto');

/**
 * Tạo ID ngẫu nhiên cho người dùng
 */
const generateUserId = () => {
  return `user-${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Lấy tất cả người dùng từ tất cả các shard
 */
const getAllUsers = async () => {
  return await dbService.executeQueryOnAllShards('SELECT * FROM users');
};

/**
 * Lấy người dùng theo user_id
 */
const getUserById = async (userId) => {
  // Tìm người dùng dựa trên user_id thay vì id tự tăng của database
  const users = await dbService.executeQueryOnAllShards(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );

  return users[0] || null;
};

/**
 * Tạo người dùng mới
 */
const createUser = async (userData) => {
  const userId = userData.user_id || generateUserId();
  const newUser = {
    ...userData,
    user_id: userId
  };

  // Xác định shard dựa vào user_id
  const shardId = require('../utils/shard.utils').getShardIdByKey(userId, 2);

  await dbService.executeQueryOnShard(
    shardId,
    'INSERT INTO users (name, email, user_id) VALUES (?, ?, ?)',
    [newUser.name, newUser.email, newUser.user_id]
  );

  return newUser;
};

/**
 * Cập nhật thông tin người dùng
 */
const updateUser = async (userId, userData) => {
  // Tìm kiếm người dùng trên tất cả các shard
  const users = await dbService.executeQueryOnAllShards(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );

  if (!users || users.length === 0) {
    throw new Error('Không tìm thấy người dùng');
  }

  // Xác định shard chứa người dùng này
  const shardId = require('../utils/shard.utils').getShardIdByKey(userId, 2);

  await dbService.executeQueryOnShard(
    shardId,
    'UPDATE users SET name = ?, email = ? WHERE user_id = ?',
    [userData.name, userData.email, userId]
  );

  return { ...users[0], ...userData };
};

/**
 * Xóa người dùng
 */
const deleteUser = async (userId) => {
  // Tìm kiếm người dùng trên tất cả các shard
  const users = await dbService.executeQueryOnAllShards(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );

  if (!users || users.length === 0) {
    throw new Error('Không tìm thấy người dùng');
  }

  // Xác định shard chứa người dùng này
  const shardId = require('../utils/shard.utils').getShardIdByKey(userId, 2);

  await dbService.executeQueryOnShard(
    shardId,
    'DELETE FROM users WHERE user_id = ?',
    [userId]
  );

  return { message: 'Đã xóa người dùng thành công' };
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
