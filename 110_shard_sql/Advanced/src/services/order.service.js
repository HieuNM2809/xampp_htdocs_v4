'use strict';

const { logger } = require('../utils/logger');
const { executeOnShard, executeOnAllShards, getShardForKey } = require('./db.service');
const { v4: uuidv4 } = require('uuid');

// Order service with sharding support
// Important: For orders, we'll shard by userId to keep all orders of a user on the same shard
const orderService = {
  // Get all orders across all shards with pagination
  // If userId is provided, only get orders for that user (from specific shard)
  getAllOrders: async (page = 1, limit = 10, userId = null) => {
    try {
      const offset = (page - 1) * limit;

      // If userId is provided, query only the specific shard
      if (userId) {
        const shardId = getShardForKey(userId);

        const query = `
          SELECT o.*,
                 JSON_ARRAYAGG(
                   JSON_OBJECT(
                     'id', oi.id,
                     'productId', oi.productId,
                     'quantity', oi.quantity,
                     'price', oi.price
                   )
                 ) as items
          FROM orders o
          JOIN order_items oi ON o.id = oi.orderId
          WHERE o.userId = ?
          GROUP BY o.id
          LIMIT ? OFFSET ?
        `;

        const results = await executeOnShard(shardId, query, [userId, limit, offset]);

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM orders WHERE userId = ?`;
        const countResult = await executeOnShard(shardId, countQuery, [userId]);
        const totalOrders = countResult[0].total;

        return {
          data: results.map(order => ({
            ...order,
            items: JSON.parse(order.items)
          })),
          pagination: {
            total: totalOrders,
            page,
            limit,
            pages: Math.ceil(totalOrders / limit)
          }
        };
      } else {
        // Query all shards for orders
        const query = `
          SELECT o.*,
                 JSON_ARRAYAGG(
                   JSON_OBJECT(
                     'id', oi.id,
                     'productId', oi.productId,
                     'quantity', oi.quantity,
                     'price', oi.price
                   )
                 ) as items
          FROM orders o
          JOIN order_items oi ON o.id = oi.orderId
          GROUP BY o.id
          LIMIT ? OFFSET ?
        `;

        const allOrders = await executeOnAllShards(query, [limit, offset]);

        // Parse items from JSON
        const processedOrders = allOrders.map(order => ({
          ...order,
          items: JSON.parse(order.items)
        }));

        // Count total orders for pagination
        const countQuery = `SELECT COUNT(*) as total FROM orders`;
        const counts = await executeOnAllShards(countQuery, []);
        const totalOrders = counts.reduce((total, row) => total + row.total, 0);

        return {
          data: processedOrders,
          pagination: {
            total: totalOrders,
            page,
            limit,
            pages: Math.ceil(totalOrders / limit)
          }
        };
      }
    } catch (error) {
      logger.error(`Error in getAllOrders: ${error.message}`);
      throw error;
    }
  },

  // Get a specific order by ID
  getOrderById: async (orderId) => {
    try {
      // We need to query all shards since we don't know which shard has the order
      // However, in a real system, we might store order lookup information in a central database
      const query = `
        SELECT o.*,
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', oi.id,
                   'productId', oi.productId,
                   'quantity', oi.quantity,
                   'price', oi.price
                 )
               ) as items
        FROM orders o
        JOIN order_items oi ON o.id = oi.orderId
        WHERE o.id = ?
        GROUP BY o.id
      `;

      const results = await executeOnAllShards(query, [orderId]);

      if (results.length === 0) {
        return null;
      }

      const order = results[0];

      return {
        ...order,
        items: JSON.parse(order.items),
        shippingAddress: JSON.parse(order.shippingAddress)
      };
    } catch (error) {
      logger.error(`Error in getOrderById: ${error.message}`);
      throw error;
    }
  },

  // Create a new order
  createOrder: async (orderData) => {
    try {
      // Generate a UUID for the new order
      const orderId = uuidv4();

      // Calculate total amount
      const totalAmount = orderData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Create the order object
      const newOrder = {
        id: orderId,
        userId: orderData.userId,
        totalAmount,
        status: 'pending',
        paymentMethod: orderData.paymentMethod,
        shippingAddress: JSON.stringify(orderData.shippingAddress),
        trackingNumber: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Important: For orders, we shard by userId to keep all orders of a user on the same shard
      const shardId = getShardForKey(orderData.userId);

      // Begin transaction
      const connection = await executeOnShard(shardId, 'START TRANSACTION', []);

      try {
        // Insert the order into the appropriate shard
        const orderQuery = `
          INSERT INTO orders (id, userId, totalAmount, status, paymentMethod, shippingAddress,
                             trackingNumber, notes, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await executeOnShard(shardId, orderQuery, [
          newOrder.id,
          newOrder.userId,
          newOrder.totalAmount,
          newOrder.status,
          newOrder.paymentMethod,
          newOrder.shippingAddress,
          newOrder.trackingNumber,
          newOrder.notes,
          newOrder.createdAt,
          newOrder.updatedAt
        ]);

        // Insert all order items
        for (const item of orderData.items) {
          const orderItemId = uuidv4();

          const orderItemQuery = `
            INSERT INTO order_items (id, orderId, productId, quantity, price)
            VALUES (?, ?, ?, ?, ?)
          `;

          await executeOnShard(shardId, orderItemQuery, [
            orderItemId,
            orderId,
            item.productId,
            item.quantity,
            item.price
          ]);
        }

        // Commit transaction
        await executeOnShard(shardId, 'COMMIT', []);

        logger.info(`Order created with ID ${orderId} on shard ${shardId}`);

        // Return the created order with items
        return {
          ...newOrder,
          items: orderData.items,
          shippingAddress: orderData.shippingAddress
        };
      } catch (error) {
        // Rollback transaction in case of error
        await executeOnShard(shardId, 'ROLLBACK', []);
        throw error;
      }
    } catch (error) {
      logger.error(`Error in createOrder: ${error.message}`);
      throw error;
    }
  },

  // Update an existing order
  updateOrder: async (orderId, updateData) => {
    try {
      // For updates, we need to know which shard contains the order
      // In a real system, we might have a lookup table or consistent hashing based on orderId
      // For this demo, we'll search all shards for the order first
      const getOrderQuery = `SELECT userId FROM orders WHERE id = ?`;
      const orderResults = await executeOnAllShards(getOrderQuery, [orderId]);

      if (orderResults.length === 0) {
        return null;
      }

      // Get the userId to determine the shard
      const { userId } = orderResults[0];
      const shardId = getShardForKey(userId);

      // Update the order in the appropriate shard
      const query = `
        UPDATE orders
        SET status = ?, trackingNumber = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `;

      const result = await executeOnShard(shardId, query, [
        updateData.status,
        updateData.trackingNumber || null,
        updateData.notes || null,
        new Date(),
        orderId
      ]);

      if (result.affectedRows === 0) {
        return null;
      }

      logger.info(`Order with ID ${orderId} updated on shard ${shardId}`);

      // Get the updated order
      return await orderService.getOrderById(orderId);
    } catch (error) {
      logger.error(`Error in updateOrder: ${error.message}`);
      throw error;
    }
  },

  // Delete an order
  deleteOrder: async (orderId) => {
    try {
      // For deletion, we need to know which shard contains the order
      // Like with updates, we'll search all shards for the order first
      const getOrderQuery = `SELECT userId FROM orders WHERE id = ?`;
      const orderResults = await executeOnAllShards(getOrderQuery, [orderId]);

      if (orderResults.length === 0) {
        return false;
      }

      // Get the userId to determine the shard
      const { userId } = orderResults[0];
      const shardId = getShardForKey(userId);

      // Begin transaction
      await executeOnShard(shardId, 'START TRANSACTION', []);

      try {
        // Delete order items first (foreign key constraint)
        const deleteItemsQuery = `DELETE FROM order_items WHERE orderId = ?`;
        await executeOnShard(shardId, deleteItemsQuery, [orderId]);

        // Delete the order
        const deleteOrderQuery = `DELETE FROM orders WHERE id = ?`;
        const result = await executeOnShard(shardId, deleteOrderQuery, [orderId]);

        // Commit transaction
        await executeOnShard(shardId, 'COMMIT', []);

        logger.info(`Order with ID ${orderId} deleted from shard ${shardId}`);
        return result.affectedRows > 0;
      } catch (error) {
        // Rollback transaction in case of error
        await executeOnShard(shardId, 'ROLLBACK', []);
        throw error;
      }
    } catch (error) {
      logger.error(`Error in deleteOrder: ${error.message}`);
      throw error;
    }
  },

  // Get sales analytics
  getSalesAnalytics: async (startDate = null, endDate = null) => {
    try {
      let query, params;

      if (startDate && endDate) {
        query = `
          SELECT
            COUNT(*) as orderCount,
            SUM(totalAmount) as totalSales,
            AVG(totalAmount) as averageOrderValue,
            DATE(createdAt) as orderDate
          FROM orders
          WHERE createdAt BETWEEN ? AND ?
          GROUP BY DATE(createdAt)
          ORDER BY orderDate
        `;
        params = [startDate, endDate];
      } else {
        query = `
          SELECT
            COUNT(*) as orderCount,
            SUM(totalAmount) as totalSales,
            AVG(totalAmount) as averageOrderValue,
            DATE(createdAt) as orderDate
          FROM orders
          GROUP BY DATE(createdAt)
          ORDER BY orderDate
        `;
        params = [];
      }

      // Get data from all shards
      const results = await executeOnAllShards(query, params);

      // Aggregate results by date
      const salesByDate = {};

      for (const row of results) {
        const dateStr = row.orderDate.toISOString().split('T')[0];

        if (!salesByDate[dateStr]) {
          salesByDate[dateStr] = {
            orderCount: 0,
            totalSales: 0,
            orderValue: []
          };
        }

        salesByDate[dateStr].orderCount += row.orderCount;
        salesByDate[dateStr].totalSales += row.totalSales;
        salesByDate[dateStr].orderValue.push(row.averageOrderValue);
      }

      // Calculate overall average order value per date
      const analytics = Object.entries(salesByDate).map(([date, data]) => {
        const avgOrderValue = data.orderValue.reduce((sum, val) => sum + val, 0) / data.orderValue.length;

        return {
          date,
          orderCount: data.orderCount,
          totalSales: data.totalSales,
          averageOrderValue: avgOrderValue
        };
      });

      // Calculate summary statistics
      const totalOrders = analytics.reduce((sum, item) => sum + item.orderCount, 0);
      const totalSales = analytics.reduce((sum, item) => sum + item.totalSales, 0);
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      return {
        summary: {
          totalOrders,
          totalSales,
          averageOrderValue
        },
        dailySales: analytics
      };
    } catch (error) {
      logger.error(`Error in getSalesAnalytics: ${error.message}`);
      throw error;
    }
  }
};

module.exports = { orderService };
