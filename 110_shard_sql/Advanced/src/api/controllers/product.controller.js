'use strict';

const { logger } = require('../../utils/logger');
const { productService } = require('../../services/product.service');
const Joi = require('joi');

// Validation schema
const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  price: Joi.number().precision(2).min(0).required(),
  category: Joi.string().min(2).max(50).required(),
  stockQuantity: Joi.number().integer().min(0).required(),
  sku: Joi.string().pattern(/^[A-Z0-9]{6,10}$/).required()
});

const productController = {
  getAllProducts: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const category = req.query.category;

      const products = await productService.getAllProducts(page, limit, category);
      res.status(200).json(products);
    } catch (error) {
      logger.error(`Error in getAllProducts: ${error.message}`);
      next(error);
    }
  },

  getProductById: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const product = await productService.getProductById(productId);

      if (!product) {
        return res.status(404).json({
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      res.status(200).json(product);
    } catch (error) {
      logger.error(`Error in getProductById: ${error.message}`);
      next(error);
    }
  },

  createProduct: async (req, res, next) => {
    try {
      // Validate request body
      const { error, value } = productSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // Create the product
      const newProduct = await productService.createProduct(value);
      res.status(201).json(newProduct);
    } catch (error) {
      logger.error(`Error in createProduct: ${error.message}`);
      next(error);
    }
  },

  updateProduct: async (req, res, next) => {
    try {
      const productId = req.params.id;

      // Validate request body
      const { error, value } = productSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // Update the product
      const updatedProduct = await productService.updateProduct(productId, value);

      if (!updatedProduct) {
        return res.status(404).json({
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      res.status(200).json(updatedProduct);
    } catch (error) {
      logger.error(`Error in updateProduct: ${error.message}`);
      next(error);
    }
  },

  deleteProduct: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const deleted = await productService.deleteProduct(productId);

      if (!deleted) {
        return res.status(404).json({
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      res.status(204).send();
    } catch (error) {
      logger.error(`Error in deleteProduct: ${error.message}`);
      next(error);
    }
  }
};

module.exports = { productController };
