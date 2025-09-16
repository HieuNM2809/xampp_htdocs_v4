const express = require('express');
const router = express.Router();
const productService = require('../services/product.service');

// Lấy tất cả sản phẩm
router.get('/', async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Lấy sản phẩm theo ID
router.get('/:productId', async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Tạo sản phẩm mới
router.post('/', async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// Cập nhật sản phẩm
router.put('/:productId', async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.productId, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Xóa sản phẩm
router.delete('/:productId', async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.productId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
