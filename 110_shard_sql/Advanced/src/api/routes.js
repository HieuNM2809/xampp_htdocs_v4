'use strict';

const express = require('express');
const router = express.Router();
const { userController } = require('./controllers/user.controller');
const { productController } = require('./controllers/product.controller');
const { orderController } = require('./controllers/order.controller');

// User routes
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

// Product routes
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Order routes
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', orderController.getOrderById);
router.post('/orders', orderController.createOrder);
router.put('/orders/:id', orderController.updateOrder);
router.delete('/orders/:id', orderController.deleteOrder);

// Analytics route - aggregating data across shards
router.get('/analytics/sales', orderController.getSalesAnalytics);
router.get('/analytics/users', userController.getUserAnalytics);

const apiRoutes = router;

module.exports = { apiRoutes };
