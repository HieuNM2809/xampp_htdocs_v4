'use strict';

const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * Calculate the shard ID for a given key using consistent hashing
 *
 * @param {string} key - The key to hash (e.g., user ID, email)
 * @param {number} totalShards - Total number of shards
 * @returns {number} - The shard ID (0 to totalShards-1)
 */
const calculateShardId = (key, totalShards) => {
  if (!key) {
    throw new Error('Key cannot be empty');
  }

  const keyStr = String(key);

  // Create hash of the key
  const hash = crypto.createHash('md5').update(keyStr).digest('hex');

  // Convert first 8 chars of hash to a number and mod by totalShards
  const shardId = parseInt(hash.substring(0, 8), 16) % totalShards;

  logger.debug(`Key: ${keyStr}, Hash: ${hash}, ShardId: ${shardId}`);

  return shardId;
};

/**
 * Create a routing function for a specific entity type
 *
 * @param {string} entityKeyField - The field name to use as the shard key
 * @param {number} totalShards - Total number of shards
 * @returns {function} - Function that returns the shard ID for an entity
 */
const createShardRouter = (entityKeyField, totalShards) => {
  return (entity) => {
    if (!entity || !entity[entityKeyField]) {
      throw new Error(`Entity is missing required key field: ${entityKeyField}`);
    }

    return calculateShardId(entity[entityKeyField], totalShards);
  };
};

module.exports = {
  calculateShardId,
  createShardRouter
};
