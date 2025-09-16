'use strict';

const { logger } = require('../utils/logger');
const { executeOnShard, executeOnAllShards, getShardForKey } = require('./db.service');
const { v4: uuidv4 } = require('uuid');

// Product service with sharding support
const productService = {
  // Get all products across all shards with pagination and optional category filter
  getAllProducts: async (page = 1, limit = 10, category = null) => {
    try {
      const offset = (page - 1) * limit;

      let query, params;

      if (category) {
        query = `SELECT * FROM products WHERE category = ? LIMIT ? OFFSET ?`;
        params = [category, limit, offset];
      } else {
        query = `SELECT * FROM products LIMIT ? OFFSET ?`;
        params = [limit, offset];
      }

      // Query all shards for products
      const allProducts = await executeOnAllShards(query, params);

      // Count total products with category filter if applicable
      let countQuery, countParams;

      if (category) {
        countQuery = `SELECT COUNT(*) as total FROM products WHERE category = ?`;
        countParams = [category];
      } else {
        countQuery = `SELECT COUNT(*) as total FROM products`;
        countParams = [];
      }

      const counts = await executeOnAllShards(countQuery, countParams);
      const totalProducts = counts.reduce((total, row) => total + row.total, 0);

      return {
        data: allProducts,
        pagination: {
          total: totalProducts,
          page,
          limit,
          pages: Math.ceil(totalProducts / limit)
        }
      };
    } catch (error) {
      logger.error(`Error in getAllProducts: ${error.message}`);
      throw error;
    }
  },

  // Get a specific product by ID
  getProductById: async (productId) => {
    try {
      // Determine which shard contains this product
      const shardId = getShardForKey(productId);

      // Query only that shard
      const query = `SELECT * FROM products WHERE id = ?`;
      const results = await executeOnShard(shardId, query, [productId]);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`Error in getProductById: ${error.message}`);
      throw error;
    }
  },

  // Create a new product
  createProduct: async (productData) => {
    try {
      // Generate a UUID for the new product
      const productId = uuidv4();

      // Add productId to productData
      const newProduct = {
        id: productId,
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Determine which shard to store the product
      // For products, we'll shard by product ID
      const shardId = getShardForKey(productId);

      // Insert the product into the appropriate shard
      const query = `
        INSERT INTO products (id, name, description, price, category, stockQuantity, sku, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await executeOnShard(shardId, query, [
        newProduct.id,
        newProduct.name,
        newProduct.description,
        newProduct.price,
        newProduct.category,
        newProduct.stockQuantity,
        newProduct.sku,
        newProduct.createdAt,
        newProduct.updatedAt
      ]);

      logger.info(`Product created with ID ${productId} on shard ${shardId}`);
      return newProduct;
    } catch (error) {
      logger.error(`Error in createProduct: ${error.message}`);
      throw error;
    }
  },

  // Update an existing product
  updateProduct: async (productId, productData) => {
    try {
      // Determine which shard contains this product
      const shardId = getShardForKey(productId);

      // Update the product in the appropriate shard
      const updateData = {
        ...productData,
        updatedAt: new Date()
      };

      const query = `
        UPDATE products
        SET name = ?, description = ?, price = ?, category = ?, stockQuantity = ?, sku = ?, updatedAt = ?
        WHERE id = ?
      `;

      const result = await executeOnShard(shardId, query, [
        updateData.name,
        updateData.description,
        updateData.price,
        updateData.category,
        updateData.stockQuantity,
        updateData.sku,
        updateData.updatedAt,
        productId
      ]);

      if (result.affectedRows === 0) {
        return null;
      }

      logger.info(`Product with ID ${productId} updated on shard ${shardId}`);

      // Get the updated product
      return await productService.getProductById(productId);
    } catch (error) {
      logger.error(`Error in updateProduct: ${error.message}`);
      throw error;
    }
  },

  // Delete a product
  deleteProduct: async (productId) => {
    try {
      // Determine which shard contains this product
      const shardId = getShardForKey(productId);

      // Delete the product from the appropriate shard
      const query = `DELETE FROM products WHERE id = ?`;
      const result = await executeOnShard(shardId, query, [productId]);

      logger.info(`Product with ID ${productId} deleted from shard ${shardId}`);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in deleteProduct: ${error.message}`);
      throw error;
    }
  }
};

module.exports = { productService };
