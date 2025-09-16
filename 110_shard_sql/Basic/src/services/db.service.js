const mysql = require('mysql2/promise');
const dbConfig = require('../config/db.config');
const shardUtils = require('../utils/shard.utils');

// Kết nối đến các database shards
const shardPools = [];
// Flag để kiểm tra trạng thái reconnection
let isReconnecting = false;
// Lưu lại cấu hình để reconnect
let shardConfigs = [];

/**
 * Khởi tạo kết nối đến một shard
 */
const connectToShard = async (config, shardIndex = -1) => {
  try {
    // Tạo pool connection với cơ chế tự động reconnect
    const poolConfig = {
      ...config,
      waitForConnections: true,
      connectionLimit: config.connectionLimit || 10,
      queueLimit: 0
    };

    const pool = mysql.createPool(poolConfig);

    // Kiểm tra kết nối
    await pool.query('SELECT 1');

    if (shardIndex >= 0) {
      // Nếu đang reconnect, thay thế pool tại vị trí cũ
      shardPools[shardIndex] = pool;
      console.log(`Đã kết nối lại thành công đến shard: ${config.host} - ${config.database}`);
    } else {
      // Kết nối mới, thêm vào danh sách
      shardPools.push(pool);
      shardConfigs.push(config);
      console.log(`Đã kết nối thành công đến shard: ${config.host} - ${config.database}`);
    }

    return pool;
  } catch (error) {
    console.error(`Lỗi khi kết nối đến shard ${config.host} - ${config.database}:`, error);
    throw error;
  }
};

/**
 * Khởi tạo kết nối đến tất cả các shard
 */
const initializeConnections = async () => {
  try {
    shardConfigs = dbConfig.shards;
    for (const config of shardConfigs) {
      await connectToShard(config);
    }
  } catch (error) {
    console.error('Lỗi khi kết nối đến database:', error);
    throw error;
  }
};

/**
 * Lấy pool kết nối tới shard dựa vào shardId
 */
const getShardPool = (shardId) => {
  if (shardId < 0 || shardId >= shardPools.length) {
    throw new Error(`Shard không hợp lệ: ${shardId}`);
  }
  return shardPools[shardId];
};

/**
 * Thử kết nối lại với shard nếu bị lỗi
 */
const tryReconnect = async (shardId) => {
  if (isReconnecting) return false;

  isReconnecting = true;
  console.log(`Đang thử kết nối lại với shard ${shardId}...`);

  try {
    if (shardId >= 0 && shardId < shardConfigs.length) {
      await connectToShard(shardConfigs[shardId], shardId);
      isReconnecting = false;
      return true;
    }
    isReconnecting = false;
    return false;
  } catch (error) {
    isReconnecting = false;
    console.error(`Không thể kết nối lại với shard ${shardId}:`, error);
    return false;
  }
};

/**
 * Thực hiện query trên một shard cụ thể
 */
const executeQueryOnShard = async (shardId, query, params = [], retries = 3) => {
  try {
    const pool = getShardPool(shardId);
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT')) {
      console.error(`Lỗi kết nối đến shard ${shardId}. Đang thử kết nối lại... (còn ${retries} lần thử)`);

      const reconnected = await tryReconnect(shardId);

      if (reconnected) {
        console.log(`Kết nối lại thành công, thử thực hiện query lại.`);
        // Thực hiện lại query với số lần thử giảm đi 1
        return executeQueryOnShard(shardId, query, params, retries - 1);
      }
    }

    // Nếu không phải lỗi kết nối hoặc không thể kết nối lại, ném lỗi
    throw error;
  }
};

/**
 * Thực hiện query trên tất cả các shard và tổng hợp kết quả
 */
const executeQueryOnAllShards = async (query, params = []) => {
  const results = [];
  const errors = [];

  for (let i = 0; i < shardPools.length; i++) {
    try {
      const rows = await executeQueryOnShard(i, query, params);
      results.push(...rows);
    } catch (error) {
      console.error(`Lỗi khi thực hiện query trên shard ${i}:`, error);
      errors.push({ shardId: i, error });
    }
  }

  // Nếu không lấy được dữ liệu từ bất kỳ shard nào và có lỗi
  if (results.length === 0 && errors.length > 0) {
    throw new Error('Không thể thực hiện query trên bất kỳ shard nào');
  }

  return results;
};

/**
 * Thực hiện query dựa vào key để xác định shard
 */
const executeQueryByKey = async (key, query, params = []) => {
  const shardId = shardUtils.getShardIdByKey(key, shardPools.length);
  return executeQueryOnShard(shardId, query, params);
};

/**
 * Kiểm tra tình trạng kết nối của tất cả các shards
 */
const checkConnections = async () => {
  const status = [];

  for (let i = 0; i < shardPools.length; i++) {
    try {
      const pool = shardPools[i];
      await pool.query('SELECT 1');
      status.push({ shardId: i, connected: true });
    } catch (error) {
      status.push({ shardId: i, connected: false, error: error.message });

      // Thử kết nối lại ngay lập tức
      tryReconnect(i).catch(err => {
        console.error(`Không thể kết nối lại với shard ${i}:`, err);
      });
    }
  }

  return status;
};

// Kiểm tra kết nối định kỳ mỗi 30 giây
setInterval(async () => {
  try {
    console.log('Đang kiểm tra tình trạng kết nối của các shard...');
    const status = await checkConnections();
    const disconnectedShards = status.filter(s => !s.connected);

    if (disconnectedShards.length > 0) {
      console.log(`Có ${disconnectedShards.length} shard đang mất kết nối.`);
    } else {
      console.log('Tất cả các shard đều đang kết nối tốt.');
    }
  } catch (error) {
    console.error('Lỗi khi kiểm tra kết nối:', error);
  }
}, 30000); // 30 giây

module.exports = {
  initializeConnections,
  getShardPool,
  executeQueryOnShard,
  executeQueryOnAllShards,
  executeQueryByKey,
  checkConnections
};
