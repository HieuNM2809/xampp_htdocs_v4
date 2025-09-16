'use strict';

require('dotenv').config();
const { logger } = require('./logger');
const { calculateShardId } = require('./shard.utils');
const { connectToShards, executeOnShard, executeOnAllShards, getShardForKey, closeAllConnections } = require('../services/db.service');
const { v4: uuidv4 } = require('uuid');

// Sample test IDs to demonstrate consistent hashing
const testIds = [
  '7ef8f2a0-8786-4129-a195-a5c8c5efd9bc',
  'a079d197-1325-4b6c-8f6d-91f91e5fca26',
  '4f68451c-f0d5-4294-b900-01a7498d9df4',
  'f33d3a73-6f65-48c7-8c9a-2d7b1f145678',
  '15c7f8c9-2e65-4e5f-a67b-8d9c4e5f6a7b',
  'c7e4f5d6-3a2b-1c9d-8e7f-6a5b4c3d2e1f',
  uuidv4(),
  uuidv4(),
  uuidv4(),
  uuidv4()
];

// Demo 1: Show how IDs are distributed across shards
const demonstrateSharding = () => {
  logger.info('=== Demonstrating Shard Distribution ===');

  // Count distribution
  const shardDistribution = {
    0: 0,
    1: 0
  };

  // Calculate shard for each test ID
  for (const id of testIds) {
    const shardId = calculateShardId(id, 2);
    shardDistribution[shardId]++;
    logger.info(`ID ${id} maps to shard ${shardId}`);
  }

  logger.info('Shard distribution summary:');
  logger.info(`Shard 0: ${shardDistribution[0]} IDs`);
  logger.info(`Shard 1: ${shardDistribution[1]} IDs`);
};

// Demo 2: Create users across shards
const createUsersAcrossShards = async () => {
  logger.info('=== Creating Users Across Shards ===');

  try {
    // Connect to database shards
    await connectToShards();

    // Create new users
    for (let i = 0; i < 5; i++) {
      const userId = uuidv4();
      const shardId = getShardForKey(userId);

      const user = {
        id: userId,
        email: `user${i+1}@example.com`,
        username: `testuser${i+1}`,
        firstName: `First${i+1}`,
        lastName: `Last${i+1}`,
        country: `Country${i+1}`,
        city: `City${i+1}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const query = `
        INSERT INTO users (id, email, username, firstName, lastName, country, city, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await executeOnShard(shardId, query, [
        user.id,
        user.email,
        user.username,
        user.firstName,
        user.lastName,
        user.country,
        user.city,
        user.createdAt,
        user.updatedAt
      ]);

      logger.info(`Created user ${user.username} with ID ${user.id} on shard ${shardId}`);
    }
  } catch (error) {
    logger.error(`Error creating users: ${error.message}`);
  }
};

// Demo 3: Query users from all shards
const queryAllUsers = async () => {
  logger.info('=== Querying Users From All Shards ===');

  try {
    const query = 'SELECT * FROM users';
    const users = await executeOnAllShards(query, []);

    logger.info(`Retrieved ${users.length} users from all shards`);

    // Count users by shard
    const usersByShardId = {};
    for (const user of users) {
      if (!usersByShardId[user._shardId]) {
        usersByShardId[user._shardId] = 0;
      }
      usersByShardId[user._shardId]++;
    }

    // Log the distribution
    for (const shardId in usersByShardId) {
      logger.info(`Shard ${shardId}: ${usersByShardId[shardId]} users`);
    }

    // Log the first 3 users as example
    const sampleUsers = users.slice(0, 3);
    for (const user of sampleUsers) {
      logger.info(`User ${user.username} (${user.id}) from shard ${user._shardId}`);
    }
  } catch (error) {
    logger.error(`Error querying users: ${error.message}`);
  }
};

// Demo 4: Query a specific user by ID
const queryUserById = async (userId) => {
  logger.info(`=== Querying User By ID: ${userId} ===`);

  try {
    const shardId = getShardForKey(userId);
    logger.info(`Looking for user in shard ${shardId}`);

    const query = 'SELECT * FROM users WHERE id = ?';
    const result = await executeOnShard(shardId, query, [userId]);

    if (result.length > 0) {
      const user = result[0];
      logger.info(`Found user: ${user.username} (${user.id})`);
      return user;
    } else {
      logger.info('User not found');
      return null;
    }
  } catch (error) {
    logger.error(`Error querying user by ID: ${error.message}`);
    return null;
  }
};

// Demo 5: Create an order for a user
const createOrderForUser = async (userId) => {
  logger.info(`=== Creating Order for User: ${userId} ===`);

  try {
    // Get the shard ID for this user
    const shardId = getShardForKey(userId);
    logger.info(`User ${userId} is on shard ${shardId}`);

    // Create order
    const orderId = uuidv4();
    const orderItems = [
      {
        id: uuidv4(),
        productId: '94f2579a-e787-4bbb-b5e2-aac3c2b5d6e7',  // Smartphone X
        quantity: 1,
        price: 999.99
      },
      {
        id: uuidv4(),
        productId: '3bce6570-4c83-4a5d-9d3e-5bd5a9c31f39',  // Desk Chair
        quantity: 2,
        price: 199.99
      }
    ];

    // Calculate total amount
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create shipping address
    const shippingAddress = JSON.stringify({
      street: '123 Main St',
      city: 'Anytown',
      state: 'State',
      country: 'Country',
      zipCode: '12345'
    });

    // Begin transaction
    await executeOnShard(shardId, 'START TRANSACTION', []);

    try {
      // Insert order
      const orderQuery = `
        INSERT INTO orders (id, userId, totalAmount, status, paymentMethod, shippingAddress,
                           trackingNumber, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await executeOnShard(shardId, orderQuery, [
        orderId,
        userId,
        totalAmount,
        'pending',
        'credit_card',
        shippingAddress,
        null,
        'Demo order',
        new Date(),
        new Date()
      ]);

      // Insert order items
      for (const item of orderItems) {
        const orderItemQuery = `
          INSERT INTO order_items (id, orderId, productId, quantity, price)
          VALUES (?, ?, ?, ?, ?)
        `;

        await executeOnShard(shardId, orderItemQuery, [
          item.id,
          orderId,
          item.productId,
          item.quantity,
          item.price
        ]);
      }

      // Commit transaction
      await executeOnShard(shardId, 'COMMIT', []);

      logger.info(`Created order ${orderId} for user ${userId} on shard ${shardId}`);
      logger.info(`Order total: $${totalAmount}`);
      return orderId;
    } catch (error) {
      // Rollback transaction in case of error
      await executeOnShard(shardId, 'ROLLBACK', []);
      throw error;
    }
  } catch (error) {
    logger.error(`Error creating order: ${error.message}`);
    return null;
  }
};

// Demo 6: Get all orders for a user
const getOrdersForUser = async (userId) => {
  logger.info(`=== Getting Orders for User: ${userId} ===`);

  try {
    const shardId = getShardForKey(userId);
    logger.info(`Looking for orders in shard ${shardId}`);

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
    `;

    const orders = await executeOnShard(shardId, query, [userId]);

    logger.info(`Found ${orders.length} orders for user ${userId}`);

    for (const order of orders) {
      logger.info(`Order ${order.id}: $${order.totalAmount}, Status: ${order.status}`);

      // Parse items
      const items = JSON.parse(order.items);
      logger.info(`Items: ${items.length}`);
      for (const item of items) {
        logger.info(`  Product ${item.productId}: ${item.quantity} x $${item.price}`);
      }
    }

    return orders;
  } catch (error) {
    logger.error(`Error getting orders: ${error.message}`);
    return [];
  }
};

// Run all demos
const runAllDemos = async () => {
  try {
    logger.info('Starting sharding demonstration...');

    // Demo 1: Show shard distribution
    demonstrateSharding();

    // Connect to database shards
    await connectToShards();

    // Demo 2: Create users across shards
    await createUsersAcrossShards();

    // Demo 3: Query all users
    await queryAllUsers();

    // Demo 4: Query specific user
    const targetUserId = testIds[0];
    const user = await queryUserById(targetUserId);

    if (user) {
      // Demo 5: Create an order
      const orderId = await createOrderForUser(user.id);

      // Demo 6: Get orders for user
      await getOrdersForUser(user.id);
    }

    // Close connections
    await closeAllConnections();

    logger.info('Demonstration completed!');
  } catch (error) {
    logger.error(`Error in demonstration: ${error.message}`);
  }
};

// Run the demos
if (require.main === module) {
  runAllDemos();
}

module.exports = {
  demonstrateSharding,
  createUsersAcrossShards,
  queryAllUsers,
  queryUserById,
  createOrderForUser,
  getOrdersForUser,
  runAllDemos
};
