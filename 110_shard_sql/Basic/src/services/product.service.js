const dbService = require('./db.service');
const crypto = require('crypto');

/**
 * Tạo ID ngẫu nhiên cho sản phẩm
 */
const generateProductId = () => {
  return `product-${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Lấy tất cả sản phẩm từ tất cả các shard
 */
const getAllProducts = async () => {
  return await dbService.executeQueryOnAllShards('SELECT * FROM products');
};

/**
 * Lấy sản phẩm theo product_id
 */
const getProductById = async (productId) => {
  // Tìm sản phẩm dựa trên product_id thay vì id tự tăng của database
  const products = await dbService.executeQueryOnAllShards(
    'SELECT * FROM products WHERE product_id = ?',
    [productId]
  );

  return products[0] || null;
};

/**
 * Tạo sản phẩm mới
 */
const createProduct = async (productData) => {
  const productId = productData.product_id || generateProductId();
  const newProduct = {
    ...productData,
    product_id: productId
  };

  // Xác định shard dựa vào product_id
  const shardId = require('../utils/shard.utils').getShardIdByKey(productId, 2);

  await dbService.executeQueryOnShard(
    shardId,
    'INSERT INTO products (name, price, product_id) VALUES (?, ?, ?)',
    [newProduct.name, newProduct.price, newProduct.product_id]
  );

  return newProduct;
};

/**
 * Cập nhật thông tin sản phẩm
 */
const updateProduct = async (productId, productData) => {
  // Tìm kiếm sản phẩm trên tất cả các shard
  const products = await dbService.executeQueryOnAllShards(
    'SELECT * FROM products WHERE product_id = ?',
    [productId]
  );

  if (!products || products.length === 0) {
    throw new Error('Không tìm thấy sản phẩm');
  }

  // Xác định shard chứa sản phẩm này
  const shardId = require('../utils/shard.utils').getShardIdByKey(productId, 2);

  await dbService.executeQueryOnShard(
    shardId,
    'UPDATE products SET name = ?, price = ? WHERE product_id = ?',
    [productData.name, productData.price, productId]
  );

  return { ...products[0], ...productData };
};

/**
 * Xóa sản phẩm
 */
const deleteProduct = async (productId) => {
  // Tìm kiếm sản phẩm trên tất cả các shard
  const products = await dbService.executeQueryOnAllShards(
    'SELECT * FROM products WHERE product_id = ?',
    [productId]
  );

  if (!products || products.length === 0) {
    throw new Error('Không tìm thấy sản phẩm');
  }

  // Xác định shard chứa sản phẩm này
  const shardId = require('../utils/shard.utils').getShardIdByKey(productId, 2);

  await dbService.executeQueryOnShard(
    shardId,
    'DELETE FROM products WHERE product_id = ?',
    [productId]
  );

  return { message: 'Đã xóa sản phẩm thành công' };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
