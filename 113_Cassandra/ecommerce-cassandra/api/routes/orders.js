const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');

// ===================================
// ORDER MANAGEMENT ROUTES
// ===================================

// GET /api/orders/:orderId - Get order details
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!this.isValidUUID(orderId)) {
            return res.status(400).json({
                error: 'Invalid order ID',
                message: 'Order ID phải là UUID hợp lệ'
            });
        }

        const order = await Order.findOrderById(orderId);

        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                message: 'Đơn hàng không tồn tại'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            error: 'Failed to get order',
            message: 'Không thể lấy thông tin đơn hàng'
        });
    }
});

// GET /api/orders/user/:userId - Get user's order history
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, startDate } = req.query;

        if (!this.isValidUUID(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID phải là UUID hợp lệ'
            });
        }

        const options = {
            limit: Math.min(parseInt(limit), 100)
        };

        if (startDate) {
            options.startDate = new Date(startDate);
        }

        const orders = await Order.getUserOrders(userId, options);

        res.json({
            success: true,
            data: {
                orders,
                userId,
                count: orders.length
            }
        });

    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            error: 'Failed to get orders',
            message: 'Không thể lấy lịch sử đơn hàng'
        });
    }
});

// PUT /api/orders/:orderId/status - Update order status
router.put('/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, reason, note, trackingNumber } = req.body;

        if (!this.isValidUUID(orderId)) {
            return res.status(400).json({
                error: 'Invalid order ID',
                message: 'Order ID phải là UUID hợp lệ'
            });
        }

        if (!status) {
            return res.status(400).json({
                error: 'Missing status',
                message: 'Trạng thái đơn hàng là bắt buộc'
            });
        }

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: `Trạng thái phải là một trong: ${validStatuses.join(', ')}`
            });
        }

        const context = {
            reason,
            note,
            trackingNumber,
            changedBy: req.headers['x-user-id'] || null,
            changedByType: req.headers['x-user-role'] || 'system',
            source: 'api'
        };

        const updatedOrder = await Order.updateOrderStatus(orderId, status, context);

        res.json({
            success: true,
            data: updatedOrder,
            message: 'Trạng thái đơn hàng đã được cập nhật'
        });

    } catch (error) {
        console.error('Update order status error:', error);

        if (error.message.includes('Order không tồn tại')) {
            return res.status(404).json({
                error: 'Order not found',
                message: 'Đơn hàng không tồn tại'
            });
        }

        res.status(500).json({
            error: 'Status update failed',
            message: 'Không thể cập nhật trạng thái đơn hàng'
        });
    }
});

// GET /api/orders/:orderId/track - Track order status
router.get('/:orderId/track', async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!this.isValidUUID(orderId)) {
            return res.status(400).json({
                error: 'Invalid order ID',
                message: 'Order ID phải là UUID hợp lệ'
            });
        }

        const order = await Order.findOrderById(orderId);

        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                message: 'Đơn hàng không tồn tại'
            });
        }

        // Get order status history
        const statusHistory = await this.getOrderStatusHistory(orderId);

        res.json({
            success: true,
            data: {
                orderId: order.order_id,
                orderNumber: order.order_number,
                currentStatus: order.order_status,
                trackingNumber: order.tracking_number,
                estimatedDelivery: order.estimated_delivery,
                actualDelivery: order.actual_delivery_date,
                statusHistory: statusHistory,
                shippingInfo: {
                    method: order.shipping_method,
                    address: order.shipping_address,
                    shippedAt: order.shipped_at
                }
            }
        });

    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({
            error: 'Order tracking failed',
            message: 'Không thể track đơn hàng'
        });
    }
});

// POST /api/orders/:orderId/cancel - Cancel order
router.post('/:orderId/cancel', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        if (!this.isValidUUID(orderId)) {
            return res.status(400).json({
                error: 'Invalid order ID',
                message: 'Order ID phải là UUID hợp lệ'
            });
        }

        const context = {
            reason: reason || 'Customer cancellation',
            changedBy: req.headers['x-user-id'],
            changedByType: 'customer',
            source: 'api'
        };

        const cancelledOrder = await Order.updateOrderStatus(orderId, 'cancelled', context);

        res.json({
            success: true,
            data: cancelledOrder,
            message: 'Đơn hàng đã được hủy thành công'
        });

    } catch (error) {
        console.error('Cancel order error:', error);

        if (error.message.includes('Order không tồn tại')) {
            return res.status(404).json({
                error: 'Order not found',
                message: 'Đơn hàng không tồn tại'
            });
        }

        res.status(500).json({
            error: 'Order cancellation failed',
            message: 'Không thể hủy đơn hàng'
        });
    }
});

// ===================================
// UTILITY METHODS
// ===================================

router.isValidUUID = function(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

router.getOrderStatusHistory = async function(orderId) {
    const database = require('../../config/database');
    const client = database.getClient();

    try {
        const result = await client.execute(`
            SELECT * FROM order_status_history
            WHERE order_id = ?
            ORDER BY status_timestamp DESC
            LIMIT 20
        `, [orderId]);

        return result.rows;
    } catch (error) {
        console.error('Error getting order status history:', error);
        return [];
    }
};

module.exports = router;
