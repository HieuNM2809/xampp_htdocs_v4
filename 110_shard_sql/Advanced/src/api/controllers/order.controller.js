'use strict';

const { logger } = require('../../utils/logger');
const { orderService } = require('../../services/order.service');
const Joi = require('joi');

// Validation schemas
const orderItemSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().precision(2).min(0).required()
});

const orderSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  shippingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipCode: Joi.string().required()
  }).required(),
  paymentMethod: Joi.string().valid('credit_card', 'paypal', 'bank_transfer').required()
});

const orderController = {
  getAllOrders: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const userId = req.query.userId;

      const orders = await orderService.getAllOrders(page, limit, userId);
      res.status(200).json(orders);
    } catch (error) {
      logger.error(`Error in getAllOrders: ${error.message}`);
      next(error);
    }
  },

  getOrderById: async (req, res, next) => {
    try {
      const orderId = req.params.id;
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        });
      }

      res.status(200).json(order);
    } catch (error) {
      logger.error(`Error in getOrderById: ${error.message}`);
      next(error);
    }
  },

  createOrder: async (req, res, next) => {
    try {
      // Validate request body
      const { error, value } = orderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // Create the order
      const newOrder = await orderService.createOrder(value);
      res.status(201).json(newOrder);
    } catch (error) {
      logger.error(`Error in createOrder: ${error.message}`);
      next(error);
    }
  },

  updateOrder: async (req, res, next) => {
    try {
      const orderId = req.params.id;

      // For updates, we'll allow partial updates
      const updateSchema = Joi.object({
        status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').required(),
        trackingNumber: Joi.string().allow(null),
        notes: Joi.string().allow(null)
      });

      // Validate request body
      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // Update the order
      const updatedOrder = await orderService.updateOrder(orderId, value);

      if (!updatedOrder) {
        return res.status(404).json({
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        });
      }

      res.status(200).json(updatedOrder);
    } catch (error) {
      logger.error(`Error in updateOrder: ${error.message}`);
      next(error);
    }
  },

  deleteOrder: async (req, res, next) => {
    try {
      const orderId = req.params.id;
      const deleted = await orderService.deleteOrder(orderId);

      if (!deleted) {
        return res.status(404).json({
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        });
      }

      res.status(204).send();
    } catch (error) {
      logger.error(`Error in deleteOrder: ${error.message}`);
      next(error);
    }
  },

  getSalesAnalytics: async (req, res, next) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

      const analytics = await orderService.getSalesAnalytics(startDate, endDate);
      res.status(200).json(analytics);
    } catch (error) {
      logger.error(`Error in getSalesAnalytics: ${error.message}`);
      next(error);
    }
  }
};

module.exports = { orderController };
