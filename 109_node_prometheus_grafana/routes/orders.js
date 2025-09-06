const express = require('express');
const router = express.Router();
const OrderService = require('../services/orders');
const MetricsCollector = require('../metrics/collector');

// Initialize metrics collector
const metricsCollector = new MetricsCollector();

// Get all orders (paginated)
router.get('/', async (req, res) => {
  const start = Date.now();
  
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    
    // Simulate getting paginated orders with filters
    await OrderService.simulateDelay(50, 300);
    
    const orders = Array.from({ length: parseInt(limit) }, (_, i) => {
      const orderId = (parseInt(page) - 1) * parseInt(limit) + i + 1;
      return {
        id: orderId,
        userId: userId ? parseInt(userId) : Math.floor(Math.random() * 1000) + 1,
        total: Math.floor(Math.random() * 500) + 20,
        status: status || OrderService.getRandomStatus(),
        paymentMethod: OrderService.getRandomPaymentMethod(),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        itemCount: Math.floor(Math.random() * 5) + 1
      };
    });
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_orders', duration, true);
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await OrderService.getTotalCount()
      },
      filters: { status, userId },
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_orders', duration, false);
    metricsCollector.recordError('api_error', 'error', 'orders');
    
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message,
      responseTime: duration
    });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  const start = Date.now();
  const orderId = parseInt(req.params.id);
  
  try {
    const result = await OrderService.getOrderById(orderId);
    const duration = Date.now() - start;
    
    metricsCollector.recordBusinessOperation('get_order_by_id', duration, true);
    
    res.json({
      order: result.order,
      meta: {
        responseTime: duration,
        cached: result.cached
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_order_by_id', duration, false);
    metricsCollector.recordError('order_not_found', 'info', 'orders');
    
    res.status(404).json({
      error: 'Order not found',
      message: error.error,
      responseTime: duration
    });
  }
});

// Create new order
router.post('/', async (req, res) => {
  const start = Date.now();
  
  try {
    const { userId, items, paymentMethod } = req.body;
    
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'orders');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'items (array with at least one item)'],
        responseTime: duration
      });
    }
    
    const result = await OrderService.createOrder({
      userId,
      items,
      paymentMethod
    });
    
    const duration = Date.now() - start;
    
    // Record order metrics
    const orderValue = result.order.total;
    const category = items[0]?.category || 'unknown';
    metricsCollector.recordOrder(orderValue, category, paymentMethod || 'unknown');
    metricsCollector.recordBusinessOperation('create_order', duration, true);
    
    res.status(201).json({
      order: result.order,
      inventoryReserved: result.inventoryReserved,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('create_order', duration, false);
    metricsCollector.recordError('order_creation_failed', 'error', 'orders');
    
    res.status(400).json({
      error: 'Failed to create order',
      message: error.error,
      responseTime: duration
    });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  const start = Date.now();
  const orderId = parseInt(req.params.id);
  
  try {
    const { status } = req.body;
    
    if (!status) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'orders');
      return res.status(400).json({
        error: 'Status is required',
        validStatuses: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        responseTime: duration
      });
    }
    
    const result = await OrderService.updateOrderStatus(orderId, status);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('update_order_status', duration, true);
    
    res.json({
      success: result.success,
      orderId: result.orderId,
      newStatus: result.newStatus,
      affectedRows: result.affectedRows,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('update_order_status', duration, false);
    metricsCollector.recordError('status_update_failed', 'error', 'orders');
    
    res.status(400).json({
      error: 'Failed to update order status',
      message: error.error,
      responseTime: duration
    });
  }
});

// Cancel order
router.post('/:id/cancel', async (req, res) => {
  const start = Date.now();
  const orderId = parseInt(req.params.id);
  
  try {
    const { reason } = req.body;
    
    if (!reason) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'orders');
      return res.status(400).json({
        error: 'Cancellation reason is required',
        responseTime: duration
      });
    }
    
    const result = await OrderService.cancelOrder(orderId, reason);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('cancel_order', duration, true);
    
    res.json({
      success: result.success,
      orderId: result.orderId,
      reason: result.reason,
      refundProcessed: result.refundProcessed,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('cancel_order', duration, false);
    metricsCollector.recordError('order_cancellation_failed', 'error', 'orders');
    
    res.status(400).json({
      error: 'Failed to cancel order',
      message: error.error,
      responseTime: duration
    });
  }
});

// Process payment for order
router.post('/:id/payment', async (req, res) => {
  const start = Date.now();
  const orderId = parseInt(req.params.id);
  
  try {
    const { method, amount, cardToken } = req.body;
    
    if (!method || !amount) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'orders');
      return res.status(400).json({
        error: 'Payment method and amount are required',
        responseTime: duration
      });
    }
    
    const result = await OrderService.processPayment(orderId, {
      method,
      amount,
      cardToken
    });
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('process_payment', duration, true);
    metricsCollector.recordOrder(amount, 'payment', method);
    
    res.json({
      success: result.success,
      transactionId: result.transactionId,
      paymentMethod: result.paymentMethod,
      amount: result.amount,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('process_payment', duration, false);
    metricsCollector.recordError('payment_failed', 'error', 'orders');
    
    res.status(400).json({
      error: 'Payment processing failed',
      message: error.error,
      responseTime: duration
    });
  }
});

// Get order analytics
router.get('/analytics/overview', async (req, res) => {
  const start = Date.now();
  
  try {
    const analytics = await OrderService.getOrderAnalytics();
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_order_analytics', duration, true);
    
    res.json({
      ...analytics,
      meta: {
        responseTime: duration,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_order_analytics', duration, false);
    metricsCollector.recordError('analytics_failed', 'error', 'orders');
    
    res.status(500).json({
      error: 'Failed to generate order analytics',
      message: error.error,
      responseTime: duration
    });
  }
});

// Get orders by user
router.get('/user/:userId', async (req, res) => {
  const start = Date.now();
  const userId = parseInt(req.params.userId);
  
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Simulate getting user's orders
    await OrderService.simulateDelay(30, 150);
    
    const orders = Array.from({ length: Math.min(parseInt(limit), 20) }, (_, i) => ({
      id: userId * 1000 + i + 1,
      userId: userId,
      total: Math.floor(Math.random() * 300) + 25,
      status: status || OrderService.getRandomStatus(),
      paymentMethod: OrderService.getRandomPaymentMethod(),
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      itemCount: Math.floor(Math.random() * 3) + 1
    }));
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_user_orders', duration, true);
    
    res.json({
      orders,
      userId: userId,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Math.floor(Math.random() * 50) + 5
      },
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_user_orders', duration, false);
    metricsCollector.recordError('api_error', 'error', 'orders');
    
    res.status(500).json({
      error: 'Failed to fetch user orders',
      message: error.message,
      responseTime: duration
    });
  }
});

// Search orders
router.get('/search', async (req, res) => {
  const start = Date.now();
  
  try {
    const { q, status, dateFrom, dateTo, minAmount, maxAmount } = req.query;
    
    if (!q) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'orders');
      return res.status(400).json({
        error: 'Search query is required',
        responseTime: duration
      });
    }
    
    // Simulate search operation
    await OrderService.simulateDelay(100, 500);
    
    const orders = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
      id: Math.floor(Math.random() * 100000) + 1,
      userId: Math.floor(Math.random() * 1000) + 1,
      total: Math.floor(Math.random() * 500) + 20,
      status: status || OrderService.getRandomStatus(),
      paymentMethod: OrderService.getRandomPaymentMethod(),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      relevanceScore: Math.random().toFixed(2)
    }));
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('search_orders', duration, true);
    
    res.json({
      orders,
      query: q,
      filters: { status, dateFrom, dateTo, minAmount, maxAmount },
      resultCount: orders.length,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('search_orders', duration, false);
    metricsCollector.recordError('search_failed', 'error', 'orders');
    
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      responseTime: duration
    });
  }
});

// Bulk update orders
router.patch('/bulk/status', async (req, res) => {
  const start = Date.now();
  
  try {
    const { orderIds, status } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || !status) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'orders');
      return res.status(400).json({
        error: 'Order IDs array and status are required',
        responseTime: duration
      });
    }
    
    const results = [];
    for (const orderId of orderIds) {
      try {
        const result = await OrderService.updateOrderStatus(orderId, status);
        results.push({ orderId, success: true, newStatus: status });
      } catch (error) {
        results.push({ orderId, success: false, error: error.error });
      }
    }
    
    const duration = Date.now() - start;
    const successCount = results.filter(r => r.success).length;
    
    metricsCollector.recordBusinessOperation('bulk_update_orders', duration, successCount > 0);
    
    res.json({
      total: orderIds.length,
      successful: successCount,
      failed: orderIds.length - successCount,
      results,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('bulk_update_orders', duration, false);
    metricsCollector.recordError('bulk_operation_failed', 'error', 'orders');
    
    res.status(500).json({
      error: 'Bulk update failed',
      message: error.message,
      responseTime: duration
    });
  }
});

// Export orders (simulate CSV generation)
router.get('/export/csv', async (req, res) => {
  const start = Date.now();
  
  try {
    const { dateFrom, dateTo, status } = req.query;
    
    // Simulate CSV generation
    await OrderService.simulateDelay(500, 2000);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('export_orders', duration, true);
    
    res.json({
      message: 'Export initiated',
      filters: { dateFrom, dateTo, status },
      exportId: `export_${Date.now()}`,
      estimatedSize: `${Math.floor(Math.random() * 1000) + 100} records`,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('export_orders', duration, false);
    metricsCollector.recordError('export_failed', 'error', 'orders');
    
    res.status(500).json({
      error: 'Export failed',
      message: error.message,
      responseTime: duration
    });
  }
});

module.exports = router;
