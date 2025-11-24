const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');

// ===================================
// SHOPPING CART ROUTES
// ===================================

// POST /api/cart - Create new shopping cart
router.post('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || null;
        const sessionId = req.headers['x-session-id'] || req.body.sessionId;

        const deviceContext = {
            deviceInfo: {
                type: req.body.deviceType || 'unknown',
                browser: req.get('User-Agent')
            },
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
        };

        const cartId = await Order.createCart(userId, sessionId, deviceContext);

        res.status(201).json({
            success: true,
            data: {
                cartId,
                userId,
                sessionId,
                createdAt: new Date()
            },
            message: 'Giỏ hàng đã được tạo thành công'
        });

    } catch (error) {
        console.error('Create cart error:', error);
        res.status(500).json({
            error: 'Cart creation failed',
            message: 'Không thể tạo giỏ hàng'
        });
    }
});

// GET /api/cart/:cartId - Get cart contents
router.get('/:cartId', async (req, res) => {
    try {
        const { cartId } = req.params;
        const { includeItems = 'true' } = req.query;

        if (!this.isValidUUID(cartId)) {
            return res.status(400).json({
                error: 'Invalid cart ID',
                message: 'Cart ID phải là UUID hợp lệ'
            });
        }

        const cart = await Order.getCart(cartId, includeItems === 'true');

        if (!cart) {
            return res.status(404).json({
                error: 'Cart not found',
                message: 'Giỏ hàng không tồn tại hoặc đã hết hạn'
            });
        }

        res.json({
            success: true,
            data: cart
        });

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            error: 'Cart retrieval failed',
            message: 'Không thể lấy thông tin giỏ hàng'
        });
    }
});

// POST /api/cart/:cartId/items - Add item to cart
router.post('/:cartId/items', async (req, res) => {
    try {
        const { cartId } = req.params;
        const { productId, quantity = 1, customizations } = req.body;

        if (!this.isValidUUID(cartId) || !this.isValidUUID(productId)) {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'Cart ID và Product ID phải là UUID hợp lệ'
            });
        }

        if (quantity <= 0 || quantity > 100) {
            return res.status(400).json({
                error: 'Invalid quantity',
                message: 'Số lượng phải từ 1 đến 100'
            });
        }

        const cartItemId = await Order.addToCart(
            cartId,
            productId,
            parseInt(quantity),
            customizations || {}
        );

        res.status(201).json({
            success: true,
            data: {
                cartItemId,
                cartId,
                productId,
                quantity: parseInt(quantity)
            },
            message: 'Sản phẩm đã được thêm vào giỏ hàng'
        });

    } catch (error) {
        console.error('Add to cart error:', error);

        if (error.message.includes('Sản phẩm không tồn tại')) {
            return res.status(404).json({
                error: 'Product not found',
                message: 'Sản phẩm không tồn tại'
            });
        }

        if (error.message.includes('Chỉ còn')) {
            return res.status(409).json({
                error: 'Insufficient inventory',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Add to cart failed',
            message: 'Không thể thêm sản phẩm vào giỏ hàng'
        });
    }
});

// POST /api/cart/:cartId/checkout - Convert cart to order
router.post('/:cartId/checkout', async (req, res) => {
    try {
        const { cartId } = req.params;
        const orderData = req.body;

        if (!this.isValidUUID(cartId)) {
            return res.status(400).json({
                error: 'Invalid cart ID',
                message: 'Cart ID phải là UUID hợp lệ'
            });
        }

        // Validate required checkout data
        if (!orderData.customerId || !orderData.customerEmail || !orderData.shippingAddress) {
            return res.status(400).json({
                error: 'Missing checkout data',
                message: 'Customer ID, email và shipping address là bắt buộc'
            });
        }

        // Add request context
        orderData.ipAddress = req.ip;
        orderData.userAgent = req.get('User-Agent');

        const order = await Order.createOrder(cartId, orderData);

        res.status(201).json({
            success: true,
            data: order,
            message: 'Đơn hàng đã được tạo thành công'
        });

    } catch (error) {
        console.error('Checkout error:', error);

        if (error.message.includes('Giỏ hàng trống')) {
            return res.status(400).json({
                error: 'Empty cart',
                message: 'Giỏ hàng trống, không thể thanh toán'
            });
        }

        if (error.message.includes('Insufficient inventory')) {
            return res.status(409).json({
                error: 'Inventory insufficient',
                message: 'Một số sản phẩm không đủ hàng'
            });
        }

        res.status(500).json({
            error: 'Checkout failed',
            message: 'Không thể tạo đơn hàng'
        });
    }
});

// PUT /api/cart/:cartId/items/:itemId - Update cart item quantity
router.put('/:cartId/items/:itemId', async (req, res) => {
    try {
        const { cartId, itemId } = req.params;
        const { quantity } = req.body;

        if (!this.isValidUUID(cartId) || !this.isValidUUID(itemId)) {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'Cart ID và Item ID phải là UUID hợp lệ'
            });
        }

        if (quantity <= 0 || quantity > 100) {
            return res.status(400).json({
                error: 'Invalid quantity',
                message: 'Số lượng phải từ 1 đến 100'
            });
        }

        // Implementation would go here
        res.json({
            success: true,
            data: {
                cartId,
                itemId,
                newQuantity: parseInt(quantity)
            },
            message: 'Số lượng đã được cập nhật'
        });

    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({
            error: 'Update failed',
            message: 'Không thể cập nhật số lượng'
        });
    }
});

// DELETE /api/cart/:cartId/items/:itemId - Remove item from cart
router.delete('/:cartId/items/:itemId', async (req, res) => {
    try {
        const { cartId, itemId } = req.params;

        if (!this.isValidUUID(cartId) || !this.isValidUUID(itemId)) {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'Cart ID và Item ID phải là UUID hợp lệ'
            });
        }

        // Implementation would go here
        res.json({
            success: true,
            data: {
                cartId,
                itemId
            },
            message: 'Sản phẩm đã được xóa khỏi giỏ hàng'
        });

    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({
            error: 'Remove failed',
            message: 'Không thể xóa sản phẩm khỏi giỏ hàng'
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

module.exports = router;
