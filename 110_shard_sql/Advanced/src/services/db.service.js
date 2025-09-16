'use strict';

const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');
const { calculateShardId } = require('../utils/shard.utils');

// Sharding configuration
const shardConfig = {
  totalShards: 2,
  shards: [
    {
      id: 0,
      host: process.env.DB_SHARD_1_HOST || 'mysql-shard1',
      port: parseInt(process.env.DB_SHARD_1_PORT || 3306),
      user: process.env.DB_SHARD_1_USER || 'root',
      password: process.env.DB_SHARD_1_PASSWORD || 'rootpassword',
      database: process.env.DB_SHARD_1_DATABASE || 'sharddb1'
    },
    {
      id: 1,
      host: process.env.DB_SHARD_2_HOST || 'mysql-shard2',
      port: parseInt(process.env.DB_SHARD_2_PORT || 3306),
      user: process.env.DB_SHARD_2_USER || 'root',
      password: process.env.DB_SHARD_2_PASSWORD || 'rootpassword',
      database: process.env.DB_SHARD_2_DATABASE || 'sharddb2'
    }
  ]
};

// Pool connections for each shard
const shardPools = [];

// Initialize connections to all shards
const connectToShards = async () => {
  try {
    for (const shard of shardConfig.shards) {
      logger.info(`Connecting to shard ${shard.id} at ${shard.host}:${shard.port}...`);

      const pool = mysql.createPool({
        host: shard.host,
        port: shard.port,
        user: shard.user,
        password: shard.password,
        database: shard.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Verify connection
      await pool.query('SELECT 1');
      shardPools[shard.id] = pool;

      logger.info(`Connected to shard ${shard.id} successfully.`);
    }

    logger.info('All database shards connected successfully.');
    return true;
  } catch (error) {
    logger.error(`Failed to connect to database shards: ${error.message}`);
    throw error;
  }
};

// Execute a query on a specific shard
const executeOnShard = async (shardId, query, params) => {
  try {
    if (!shardPools[shardId]) {
      throw new Error(`Shard ${shardId} not available`);
    }

    const [results] = await shardPools[shardId].execute(query, params);
    return results;
  } catch (error) {
    logger.error(`Error executing query on shard ${shardId}: ${error.message}`);
    throw error;
  }
};

// Execute a query on all shards and aggregate results
const executeOnAllShards = async (query, params) => {
  try {
    const promises = shardPools.map(async (pool, shardId) => {
      const results = await executeOnShard(shardId, query, params);
      // Tag results with the shard ID for reference
      return results.map(row => ({ ...row, _shardId: shardId }));
    });

    const shardResults = await Promise.all(promises);
    // Flatten the results array
    return shardResults.flat();
  } catch (error) {
    logger.error(`Error executing query on all shards: ${error.message}`);
    throw error;
  }
};

// Get the shard for a specific entity by key
const getShardForKey = (key) => {
  const shardId = calculateShardId(key, shardConfig.totalShards);
  logger.debug(`Key ${key} mapped to shard ${shardId}`);
  return shardId;
};

// Close all database connections
const closeAllConnections = async () => {
  try {
    const promises = shardPools.map((pool, index) => {
      logger.info(`Closing connection to shard ${index}...`);
      return pool.end();
    });

    await Promise.all(promises);
    logger.info('All database connections closed.');
  } catch (error) {
    logger.error(`Error closing database connections: ${error.message}`);
    throw error;
  }
};

module.exports = {
  shardConfig,
  connectToShards,
  executeOnShard,
  executeOnAllShards,
  getShardForKey,
  closeAllConnections
};
