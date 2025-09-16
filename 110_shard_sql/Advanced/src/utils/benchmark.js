'use strict';

require('dotenv').config();
const { logger } = require('./logger');
const { connectToShards, executeOnShard, executeOnAllShards, getShardForKey, closeAllConnections } = require('../services/db.service');
const { v4: uuidv4 } = require('uuid');

// Configuration
const TOTAL_USERS = 1000;
const BATCH_SIZE = 100;
const ORDERS_PER_USER = 2;
const ORDER_ITEMS_PER_ORDER = 3;

// Benchmark: Create users in batches
const benchmarkCreateUsers = async () => {
  logger.info(`=== Benchmarking User Creation (${TOTAL_USERS} users) ===`);

  try {
    const startTime = Date.now();
    let shard0Count = 0;
    let shard1Count = 0;

    // Process in batches to avoid memory issues
    for (let batch = 0; batch < TOTAL_USERS / BATCH_SIZE; batch++) {
      const batchStartTime = Date.now();
      const batchStartIndex = batch * BATCH_SIZE;
      const batchEndIndex = batchStartIndex + BATCH_SIZE;

      logger.info(`Processing batch ${batch + 1}/${TOTAL_USERS / BATCH_SIZE}: users ${batchStartIndex + 1}-${batchEndIndex}`);

      for (let i = batchStartIndex; i < batchEndIndex; i++) {
        const userId = uuidv4();
        const shardId = getShardForKey(userId);

        if (shardId === 0) shard0Count++;
        else shard1Count++;

        const user = {
          id: userId,
          email: `benchmark_user${i+1}@example.com`,
          username: `benchmark_user${i+1}`,
          firstName: `First${i+1}`,
          lastName: `Last${i+1}`,
          country: `Country${Math.floor(i % 10) + 1}`,
          city: `City${Math.floor(i % 20) + 1}`,
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
      }

      const batchEndTime = Date.now();
      const batchDuration = (batchEndTime - batchStartTime) / 1000;
      logger.info(`Batch ${batch + 1} completed in ${batchDuration.toFixed(2)} seconds`);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    logger.info(`Created ${TOTAL_USERS} users in ${duration.toFixed(2)} seconds`);
    logger.info(`Average: ${(TOTAL_USERS / duration).toFixed(2)} users/second`);
    logger.info(`Distribution: Shard 0: ${shard0Count}, Shard 1: ${shard1Count}`);

    return { duration, shard0Count, shard1Count };
  } catch (error) {
    logger.error(`Error in benchmarkCreateUsers: ${error.message}`);
    throw error;
  }
};

// Benchmark: Create orders for users
const benchmarkCreateOrders = async () => {
  logger.info(`=== Benchmarking Order Creation (${ORDERS_PER_USER} orders per user) ===`);

  try {
    const startTime = Date.now();

    // Get user IDs from both shards
    const query = 'SELECT id FROM users WHERE email LIKE "benchmark_user%"';
    const allUsers = await executeOnAllShards(query, []);

    logger.info(`Found ${allUsers.length} benchmark users`);

    let orderCount = 0;
    let shard0Count = 0;
    let shard1Count = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batchUsers = allUsers.slice(i, i + batchSize);
      const batchStartTime = Date.now();

      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allUsers.length / batchSize)}: ${batchUsers.length} users`);

      for (const user of batchUsers) {
        const userId = user.id;
        const shardId = getShardForKey(userId);

        // Create ORDERS_PER_USER orders for each user
        for (let j = 0; j < ORDERS_PER_USER; j++) {
          const orderId = uuidv4();

          if (shardId === 0) shard0Count++;
          else shard1Count++;

          // Create random order items
          const items = [];
          let totalAmount = 0;

          for (let k = 0; k < ORDER_ITEMS_PER_ORDER; k++) {
            const price = parseFloat((Math.random() * 100 + 10).toFixed(2));
            const quantity = Math.floor(Math.random() * 3) + 1;
            totalAmount += price * quantity;

            items.push({
              id: uuidv4(),
              orderId,
              productId: uuidv4(),
              quantity,
              price
            });
          }

          // Create shipping address
          const shippingAddress = JSON.stringify({
            street: `${Math.floor(Math.random() * 1000) + 1} Main St`,
            city: `City${Math.floor(Math.random() * 20) + 1}`,
            state: `State${Math.floor(Math.random() * 10) + 1}`,
            country: `Country${Math.floor(Math.random() * 10) + 1}`,
            zipCode: `${Math.floor(Math.random() * 90000) + 10000}`
          });

          // Payment methods
          const paymentMethods = ['credit_card', 'paypal', 'bank_transfer'];
          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

          // Order statuses
          const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

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
            status,
            paymentMethod,
            shippingAddress,
            status !== 'pending' ? `TRACK-${Math.floor(Math.random() * 1000000)}` : null,
            'Benchmark order',
            new Date(),
            new Date()
          ]);

          // Insert order items
          for (const item of items) {
            const orderItemQuery = `
              INSERT INTO order_items (id, orderId, productId, quantity, price)
              VALUES (?, ?, ?, ?, ?)
            `;

            await executeOnShard(shardId, orderItemQuery, [
              item.id,
              item.orderId,
              item.productId,
              item.quantity,
              item.price
            ]);
          }

          orderCount++;
        }
      }

      const batchEndTime = Date.now();
      const batchDuration = (batchEndTime - batchStartTime) / 1000;
      logger.info(`Batch completed in ${batchDuration.toFixed(2)} seconds`);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    logger.info(`Created ${orderCount} orders in ${duration.toFixed(2)} seconds`);
    logger.info(`Average: ${(orderCount / duration).toFixed(2)} orders/second`);
    logger.info(`Distribution: Shard 0: ${shard0Count}, Shard 1: ${shard1Count}`);

    return { duration, orderCount, shard0Count, shard1Count };
  } catch (error) {
    logger.error(`Error in benchmarkCreateOrders: ${error.message}`);
    throw error;
  }
};

// Benchmark: Query performance
const benchmarkQueries = async () => {
  logger.info('=== Benchmarking Query Performance ===');

  try {
    // 1. Single shard query - get user by ID
    logger.info('Benchmark 1: Single shard query - get user by ID');

    // Get a random user ID
    const userQuery = 'SELECT id FROM users WHERE email LIKE "benchmark_user%" LIMIT 1';
    const userResults = await executeOnAllShards(userQuery, []);

    if (userResults.length > 0) {
      const userId = userResults[0].id;
      const shardId = getShardForKey(userId);

      const startTime1 = Date.now();

      // Run 100 queries
      for (let i = 0; i < 100; i++) {
        const query = 'SELECT * FROM users WHERE id = ?';
        await executeOnShard(shardId, query, [userId]);
      }

      const duration1 = (Date.now() - startTime1) / 1000;
      logger.info(`Single shard query - 100 iterations: ${duration1.toFixed(2)} seconds`);
      logger.info(`Average: ${(100 / duration1).toFixed(2)} queries/second`);
    }

    // 2. Cross-shard query - get all orders
    logger.info('Benchmark 2: Cross-shard query - get all orders');

    const startTime2 = Date.now();

    // Run 10 cross-shard queries
    for (let i = 0; i < 10; i++) {
      const query = 'SELECT * FROM orders LIMIT 100';
      await executeOnAllShards(query, []);
    }

    const duration2 = (Date.now() - startTime2) / 1000;
    logger.info(`Cross-shard query - 10 iterations: ${duration2.toFixed(2)} seconds`);
    logger.info(`Average: ${(10 / duration2).toFixed(2)} queries/second`);

    // 3. Aggregation query - count orders by country
    logger.info('Benchmark 3: Aggregation query - count orders by status');

    const startTime3 = Date.now();

    for (let i = 0; i < 10; i++) {
      const query = `
        SELECT status, COUNT(*) as orderCount
        FROM orders
        GROUP BY status
      `;
      await executeOnAllShards(query, []);
    }

    const duration3 = (Date.now() - startTime3) / 1000;
    logger.info(`Aggregation query - 10 iterations: ${duration3.toFixed(2)} seconds`);
    logger.info(`Average: ${(10 / duration3).toFixed(2)} queries/second`);

    return {
      singleShardQuery: duration1,
      crossShardQuery: duration2,
      aggregationQuery: duration3
    };
  } catch (error) {
    logger.error(`Error in benchmarkQueries: ${error.message}`);
    throw error;
  }
};

// Run all benchmarks
const runAllBenchmarks = async () => {
  try {
    logger.info('Starting benchmarks...');

    // Connect to database shards
    await connectToShards();

    // Create users
    const userResults = await benchmarkCreateUsers();

    // Create orders
    const orderResults = await benchmarkCreateOrders();

    // Run queries
    const queryResults = await benchmarkQueries();

    // Close connections
    await closeAllConnections();

    logger.info('Benchmarks completed!');

    // Summarize results
    logger.info('=== Benchmark Summary ===');
    logger.info(`User creation: ${userResults.duration.toFixed(2)} seconds for ${TOTAL_USERS} users (${(TOTAL_USERS / userResults.duration).toFixed(2)}/sec)`);
    logger.info(`Order creation: ${orderResults.duration.toFixed(2)} seconds for ${orderResults.orderCount} orders (${(orderResults.orderCount / orderResults.duration).toFixed(2)}/sec)`);
    logger.info(`Single shard query: ${(100 / queryResults.singleShardQuery).toFixed(2)} queries/second`);
    logger.info(`Cross shard query: ${(10 / queryResults.crossShardQuery).toFixed(2)} queries/second`);
    logger.info(`Aggregation query: ${(10 / queryResults.aggregationQuery).toFixed(2)} queries/second`);

  } catch (error) {
    logger.error(`Error in runAllBenchmarks: ${error.message}`);
  }
};

// Run the benchmarks
if (require.main === module) {
  runAllBenchmarks();
}

module.exports = {
  benchmarkCreateUsers,
  benchmarkCreateOrders,
  benchmarkQueries,
  runAllBenchmarks
};
