const crypto = require('crypto');

/**
 * Tạo hash từ key
 */
const createHash = (key) => {
  return crypto.createHash('md5').update(String(key)).digest('hex');
};

/**
 * Tính toán shardId dựa vào key (consistent hashing)
 * @param {string} key - Key để xác định shard
 * @param {number} numShards - Số lượng shard có sẵn
 * @returns {number} - Chỉ số shard (0-based)
 */
const getShardIdByKey = (key, numShards) => {
  const hash = createHash(key);
  // Chuyển đổi 8 ký tự đầu của hash thành số nguyên
  const hashVal = parseInt(hash.substring(0, 8), 16);
  // Lấy phần dư khi chia cho số lượng shard
  return Math.abs(hashVal % numShards);
};

/**
 * Phân phối đều các key theo modulo
 */
const getShardIdByModulo = (key, numShards) => {
  // Nếu key là số, sử dụng trực tiếp
  if (!isNaN(key)) {
    return Math.abs(parseInt(key) % numShards);
  }

  // Nếu key là chuỗi, tính tổng mã ASCII của các ký tự
  let sum = 0;
  for (let i = 0; i < String(key).length; i++) {
    sum += String(key).charCodeAt(i);
  }

  return Math.abs(sum % numShards);
};

module.exports = {
  getShardIdByKey,
  getShardIdByModulo,
  createHash
};
