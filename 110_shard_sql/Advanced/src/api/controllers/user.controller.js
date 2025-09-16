'use strict';

const { logger } = require('../../utils/logger');
const { userService } = require('../../services/user.service');
const Joi = require('joi');

// Validation schema
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  country: Joi.string().min(2).max(50).required(),
  city: Joi.string().min(2).max(50).required()
});

const userController = {
  getAllUsers: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const users = await userService.getAllUsers(page, limit);
      res.status(200).json(users);
    } catch (error) {
      logger.error(`Error in getAllUsers: ${error.message}`);
      next(error);
    }
  },

  getUserById: async (req, res, next) => {
    try {
      const userId = req.params.id;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.status(200).json(user);
    } catch (error) {
      logger.error(`Error in getUserById: ${error.message}`);
      next(error);
    }
  },

  createUser: async (req, res, next) => {
    try {
      // Validate request body
      const { error, value } = userSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // Create the user
      const newUser = await userService.createUser(value);
      res.status(201).json(newUser);
    } catch (error) {
      logger.error(`Error in createUser: ${error.message}`);
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const userId = req.params.id;

      // Validate request body
      const { error, value } = userSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // Update the user
      const updatedUser = await userService.updateUser(userId, value);

      if (!updatedUser) {
        return res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      logger.error(`Error in updateUser: ${error.message}`);
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const userId = req.params.id;
      const deleted = await userService.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.status(204).send();
    } catch (error) {
      logger.error(`Error in deleteUser: ${error.message}`);
      next(error);
    }
  },

  getUserAnalytics: async (req, res, next) => {
    try {
      const analytics = await userService.getUserAnalytics();
      res.status(200).json(analytics);
    } catch (error) {
      logger.error(`Error in getUserAnalytics: ${error.message}`);
      next(error);
    }
  }
};

module.exports = { userController };
