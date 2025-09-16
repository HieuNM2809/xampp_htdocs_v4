'use strict';

const { logger } = require('../utils/logger');
const { executeOnShard, executeOnAllShards, getShardForKey } = require('./db.service');
const { v4: uuidv4 } = require('uuid');

// User service with sharding support
const userService = {
  // Get all users across all shards with pagination
  getAllUsers: async (page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;

      // Query all shards for users
      const query = `SELECT * FROM users LIMIT ? OFFSET ?`;
      const allUsers = await executeOnAllShards(query, [limit, offset]);

      // Simple post-processing to count total
      const countQuery = `SELECT COUNT(*) as total FROM users`;
      const counts = await executeOnAllShards(countQuery, []);
      const totalUsers = counts.reduce((total, row) => total + row.total, 0);

      return {
        data: allUsers,
        pagination: {
          total: totalUsers,
          page,
          limit,
          pages: Math.ceil(totalUsers / limit)
        }
      };
    } catch (error) {
      logger.error(`Error in getAllUsers: ${error.message}`);
      throw error;
    }
  },

  // Get a specific user by ID
  getUserById: async (userId) => {
    try {
      // Determine which shard contains this user
      const shardId = getShardForKey(userId);

      // Query only that shard
      const query = `SELECT * FROM users WHERE id = ?`;
      const results = await executeOnShard(shardId, query, [userId]);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`Error in getUserById: ${error.message}`);
      throw error;
    }
  },

  // Create a new user
  createUser: async (userData) => {
    try {
      // Generate a UUID for the new user
      const userId = uuidv4();

      // Add userId to userData
      const newUser = {
        id: userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Determine which shard to store the user
      const shardId = getShardForKey(userId);

      // Insert the user into the appropriate shard
      const query = `
        INSERT INTO users (id, email, username, firstName, lastName, country, city, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await executeOnShard(shardId, query, [
        newUser.id,
        newUser.email,
        newUser.username,
        newUser.firstName,
        newUser.lastName,
        newUser.country,
        newUser.city,
        newUser.createdAt,
        newUser.updatedAt
      ]);

      logger.info(`User created with ID ${userId} on shard ${shardId}`);
      return newUser;
    } catch (error) {
      logger.error(`Error in createUser: ${error.message}`);
      throw error;
    }
  },

  // Update an existing user
  updateUser: async (userId, userData) => {
    try {
      // Determine which shard contains this user
      const shardId = getShardForKey(userId);

      // Update the user in the appropriate shard
      const updateData = {
        ...userData,
        updatedAt: new Date()
      };

      const query = `
        UPDATE users
        SET email = ?, username = ?, firstName = ?, lastName = ?, country = ?, city = ?, updatedAt = ?
        WHERE id = ?
      `;

      const result = await executeOnShard(shardId, query, [
        updateData.email,
        updateData.username,
        updateData.firstName,
        updateData.lastName,
        updateData.country,
        updateData.city,
        updateData.updatedAt,
        userId
      ]);

      if (result.affectedRows === 0) {
        return null;
      }

      logger.info(`User with ID ${userId} updated on shard ${shardId}`);

      // Get the updated user
      return await userService.getUserById(userId);
    } catch (error) {
      logger.error(`Error in updateUser: ${error.message}`);
      throw error;
    }
  },

  // Delete a user
  deleteUser: async (userId) => {
    try {
      // Determine which shard contains this user
      const shardId = getShardForKey(userId);

      // Delete the user from the appropriate shard
      const query = `DELETE FROM users WHERE id = ?`;
      const result = await executeOnShard(shardId, query, [userId]);

      logger.info(`User with ID ${userId} deleted from shard ${shardId}`);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in deleteUser: ${error.message}`);
      throw error;
    }
  },

  // Get analytics from users across all shards
  getUserAnalytics: async () => {
    try {
      // Example: Get user count by country across all shards
      const query = `SELECT country, COUNT(*) as userCount FROM users GROUP BY country`;
      const results = await executeOnAllShards(query, []);

      // Aggregate results from different shards
      const countByCountry = {};

      for (const row of results) {
        if (!countByCountry[row.country]) {
          countByCountry[row.country] = 0;
        }
        countByCountry[row.country] += row.userCount;
      }

      // Convert to array format
      const analytics = Object.entries(countByCountry).map(([country, userCount]) => ({
        country,
        userCount
      }));

      return {
        totalUsers: analytics.reduce((sum, item) => sum + item.userCount, 0),
        countByCountry: analytics
      };
    } catch (error) {
      logger.error(`Error in getUserAnalytics: ${error.message}`);
      throw error;
    }
  }
};

module.exports = { userService };
