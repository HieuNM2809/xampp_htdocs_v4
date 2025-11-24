const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const EcommerceProduct = require('./Product');

class EcommerceOrder {
    constructor() {
        this.ordersTable = 'orders';
        this.ordersByUserTable = 'orders_by_user';
        this.orderItemsTable = 'order_items';
        this.orderStatusHistoryTable = 'order_status_history';
        this.dailyOrderStatsTable = 'daily_order_stats';
        this.shoppingCartsTable = 'shopping_carts';
        this.cartItemsTable = 'cart_items';
    }

    // ===================================
    // SHOPPING CART MANAGEMENT
    // ===================================

    async createCart(userId = null, sessionId = null, deviceContext = {}) {
        const client = database.getClient();
        const cartId = uuidv4();
        const now = new Date();

        try {
            await client.execute(`
                INSERT INTO ${this.shoppingCartsTable}
                (cart_id, user_id, session_id, cart_status, currency, item_count,
                 subtotal_cents, created_at, updated_at, last_activity, device_info,
                 user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                cartId, userId, sessionId, 'active', 'USD', 0, 0,
                now, now, now, deviceContext.deviceInfo || {},
                deviceContext.userAgent, deviceContext.ipAddress
            ], {
                consistency: database.consistencyLevels.one
            });

            console.log(`✅ Shopping cart created: ${cartId}`);
            return cartId;

        } catch (error) {
            console.error('❌ Error creating cart:', error);
            throw error;
        }
    }

    async addToCart(cartId, productId, quantity = 1, customizations = {}) {
        const client = database.getClient();
        const cartItemId = uuidv4();
        const now = new Date();

        try {
            // Get product information
            const product = await EcommerceProduct.findById(productId, true, false);
            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            // Check inventory availability
            if (product.inventory && product.inventory.quantity_available < quantity) {
                throw new Error(`Chỉ còn ${product.inventory.quantity_available} sản phẩm trong kho`);
            }

            // Calculate pricing
            const unitPrice = product.price_cents;
            const lineTotal = unitPrice * quantity;

            const batch = [
                // Add cart item
                {
                    query: `INSERT INTO ${this.cartItemsTable}
                            (cart_id, cart_item_id, product_id, product_name, product_sku, quantity,
                             unit_price_cents, line_total_cents, customizations, added_at, updated_at,
                             max_quantity_allowed)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        cartId, cartItemId, productId, product.name, product.sku, quantity,
                        unitPrice, lineTotal, customizations, now, now,
                        product.inventory?.quantity_available || 0
                    ]
                },
                // Update cart totals
                {
                    query: `UPDATE ${this.shoppingCartsTable}
                            SET item_count = item_count + ?,
                                subtotal_cents = subtotal_cents + ?,
                                updated_at = ?, last_activity = ?
                            WHERE cart_id = ?`,
                    params: [1, lineTotal, now, now, cartId]
                }
            ];

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.localQuorum
            });

            console.log(`✅ Added to cart: ${product.name} x${quantity}`);
            return cartItemId;

        } catch (error) {
            console.error('❌ Error adding to cart:', error);
            throw error;
        }
    }

    async getCart(cartId, includeItems = true) {
        const client = database.getClient();

        try {
            // Get cart information
            const cartPromise = client.execute(
                `SELECT * FROM ${this.shoppingCartsTable} WHERE cart_id = ?`,
                [cartId],
                { consistency: database.consistencyLevels.one }
            );

            let itemsPromise = null;
            if (includeItems) {
                itemsPromise = client.execute(
                    `SELECT * FROM ${this.cartItemsTable} WHERE cart_id = ?`,
                    [cartId],
                    { consistency: database.consistencyLevels.one }
                );
            }

            const [cartResult, itemsResult] = await Promise.all([
                cartPromise,
                itemsPromise
            ]);

            if (cartResult.rows.length === 0) return null;

            const cart = cartResult.rows[0];
            const items = itemsResult ? itemsResult.rows : [];

            // Calculate cart totals (real-time calculation)
            const cartTotals = this.calculateCartTotals(items);

            return {
                ...cart,
                items: items,
                calculated_totals: cartTotals,
                items_count: items.length
            };

        } catch (error) {
            console.error('❌ Error getting cart:', error);
            throw error;
        }
    }

    // ===================================
    // ORDER CREATION & MANAGEMENT
    // ===================================

    async createOrder(cartId, orderData) {
        const client = database.getClient();
        const orderId = uuidv4();
        const now = new Date();
        const orderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            // Get cart with items
            const cart = await this.getCart(cartId, true);
            if (!cart || cart.items.length === 0) {
                throw new Error('Giỏ hàng trống hoặc không tồn tại');
            }

            // Generate human-readable order number
            const orderNumber = await this.generateOrderNumber();

            // Calculate order totals
            const orderTotals = this.calculateOrderTotals(cart.items, orderData);

            // Reserve inventory for all items
            await this.reserveOrderInventory(cart.items, orderId);

            const batch = [
                // Main order record
                {
                    query: `INSERT INTO ${this.ordersTable}
                            (order_id, customer_id, customer_email, customer_name, customer_phone,
                             order_number, order_status, order_type, subtotal_cents, tax_cents,
                             shipping_cents, total_cents, currency, payment_status, payment_method,
                             shipping_address, billing_address, shipping_method, order_source,
                             session_id, ip_address, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        orderId, orderData.customerId, orderData.customerEmail, orderData.customerName,
                        orderData.customerPhone, orderNumber, 'pending', orderData.orderType || 'standard',
                        orderTotals.subtotal, orderTotals.tax, orderTotals.shipping, orderTotals.total,
                        cart.currency, 'pending', orderData.paymentMethod, orderData.shippingAddress,
                        orderData.billingAddress, orderData.shippingMethod, 'web',
                        cart.session_id, orderData.ipAddress, now, now
                    ]
                },
                // Orders by user lookup
                {
                    query: `INSERT INTO ${this.ordersByUserTable}
                            (user_id, order_date, created_at, order_id, order_number, order_status,
                             total_cents, currency, item_count, order_summary)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        orderData.customerId, orderDate, now, orderId, orderNumber, 'pending',
                        orderTotals.total, cart.currency, cart.items.length,
                        this.generateOrderSummary(cart.items)
                    ]
                }
            ];

            // Add order items
            cart.items.forEach(item => {
                batch.push({
                    query: `INSERT INTO ${this.orderItemsTable}
                            (order_id, line_item_id, product_id, product_name, product_sku,
                             quantity_ordered, unit_price_cents, line_total_cents, item_status,
                             product_customizations, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        orderId, item.cart_item_id, item.product_id, item.product_name,
                        item.product_sku, item.quantity, item.unit_price_cents,
                        item.line_total_cents, 'pending', item.customizations, now
                    ]
                });
            });

            // Log initial status
            batch.push({
                query: `INSERT INTO ${this.orderStatusHistoryTable}
                        (order_id, status_timestamp, status_change_id, old_status, new_status,
                         change_reason, changed_by, changed_by_type, change_source)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    orderId, now, cassandra.types.TimeUuid.now(), null, 'pending',
                    'Order created', orderData.customerId, 'customer', 'web'
                ]
            });

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.quorum // Important for order integrity
            });

            // Clear the cart
            await this.clearCart(cartId);

            // Update customer counters
            await this.updateCustomerOrderCounters(orderData.customerId, orderTotals.total);

            console.log(`✅ Order created successfully: ${orderNumber}`);
            return this.findOrderById(orderId);

        } catch (error) {
            console.error('❌ Error creating order:', error);
            // Release any reserved inventory
            try {
                await this.releaseOrderInventory(cart?.items || [], orderId);
            } catch (releaseError) {
                console.error('❌ Error releasing reserved inventory:', releaseError);
            }
            throw error;
        }
    }

    async updateOrderStatus(orderId, newStatus, context = {}) {
        const client = database.getClient();
        const now = new Date();

        try {
            // Get current order
            const order = await this.findOrderById(orderId);
            if (!order) {
                throw new Error('Order không tồn tại');
            }

            const oldStatus = order.order_status;

            if (oldStatus === newStatus) {
                console.log(`Order ${orderId} already in status ${newStatus}`);
                return order;
            }

            const batch = [
                // Update main order record
                {
                    query: `UPDATE ${this.ordersTable}
                            SET order_status = ?, updated_at = ?
                            WHERE order_id = ?`,
                    params: [newStatus, now, orderId]
                },
                // Update orders by user
                {
                    query: `UPDATE ${this.ordersByUserTable}
                            SET order_status = ?
                            WHERE user_id = ? AND order_date = ? AND order_id = ?`,
                    params: [newStatus, order.customer_id, order.order_date, orderId]
                },
                // Log status change
                {
                    query: `INSERT INTO ${this.orderStatusHistoryTable}
                            (order_id, status_timestamp, status_change_id, old_status, new_status,
                             change_reason, change_note, changed_by, changed_by_type, change_source)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        orderId, now, cassandra.types.TimeUuid.now(), oldStatus, newStatus,
                        context.reason || 'Status update', context.note,
                        context.changedBy, context.changedByType || 'system', context.source || 'api'
                    ]
                }
            ];

            // Handle status-specific logic
            if (newStatus === 'cancelled') {
                // Release inventory reservations
                await this.releaseOrderInventoryReservations(orderId);
            } else if (newStatus === 'shipped') {
                // Update shipping information
                if (context.trackingNumber) {
                    batch.push({
                        query: `UPDATE ${this.ordersTable}
                                SET tracking_number = ?, shipped_at = ?
                                WHERE order_id = ?`,
                        params: [context.trackingNumber, now, orderId]
                    });
                }
            } else if (newStatus === 'delivered') {
                // Mark as delivered and update delivery date
                batch.push({
                    query: `UPDATE ${this.ordersTable}
                            SET actual_delivery_date = ?
                            WHERE order_id = ?`,
                    params: [now, orderId]
                });

                // Convert reserved inventory to sold
                await this.finalizeOrderInventory(orderId);
            }

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.quorum
            });

            console.log(`✅ Order ${order.order_number} status: ${oldStatus} → ${newStatus}`);
            return this.findOrderById(orderId);

        } catch (error) {
            console.error('❌ Error updating order status:', error);
            throw error;
        }
    }

    async findOrderById(orderId) {
        const client = database.getClient();

        try {
            // Get order với items parallel
            const [orderResult, itemsResult] = await Promise.all([
                client.execute(
                    `SELECT * FROM ${this.ordersTable} WHERE order_id = ?`,
                    [orderId],
                    { consistency: database.consistencyLevels.localQuorum }
                ),
                client.execute(
                    `SELECT * FROM ${this.orderItemsTable} WHERE order_id = ?`,
                    [orderId],
                    { consistency: database.consistencyLevels.one }
                )
            ]);

            if (orderResult.rows.length === 0) return null;

            const order = orderResult.rows[0];
            const items = itemsResult.rows;

            // Calculate order summary
            const orderSummary = {
                total_items: items.length,
                total_quantity: items.reduce((sum, item) => sum + item.quantity_ordered, 0),
                calculated_subtotal: items.reduce((sum, item) => sum + item.line_total_cents, 0)
            };

            return {
                ...order,
                items: items,
                order_summary: orderSummary
            };

        } catch (error) {
            console.error('❌ Error finding order:', error);
            throw error;
        }
    }

    async getUserOrders(userId, options = {}) {
        const client = database.getClient();
        const limit = options.limit || 50;
        const startDate = options.startDate || new Date('2020-01-01');

        try {
            const result = await client.execute(`
                SELECT * FROM ${this.ordersByUserTable}
                WHERE user_id = ? AND order_date >= ?
                ORDER BY created_at DESC
                LIMIT ?
            `, [userId, startDate, limit], {
                consistency: database.consistencyLevels.one
            });

            return result.rows;

        } catch (error) {
            console.error('❌ Error getting user orders:', error);
            throw error;
        }
    }

    // ===================================
    // INVENTORY OPERATIONS
    // ===================================

    async reserveOrderInventory(cartItems, orderId) {
        const reservationPromises = cartItems.map(item =>
            EcommerceProduct.reserveInventory(item.product_id, item.quantity, orderId)
        );

        try {
            await Promise.all(reservationPromises);
            console.log(`✅ Inventory reserved for order ${orderId}`);
        } catch (error) {
            console.error('❌ Error reserving inventory:', error);
            // Rollback any successful reservations
            await this.rollbackInventoryReservations(cartItems, orderId);
            throw error;
        }
    }

    async releaseOrderInventoryReservations(orderId) {
        const client = database.getClient();

        try {
            // Get order items
            const items = await client.execute(
                `SELECT * FROM ${this.orderItemsTable} WHERE order_id = ?`,
                [orderId]
            );

            const releasePromises = items.rows.map(item =>
                EcommerceProduct.releaseInventoryReservation(
                    item.product_id,
                    item.quantity_ordered,
                    orderId
                )
            );

            await Promise.all(releasePromises);
            console.log(`✅ Inventory reservations released for order ${orderId}`);

        } catch (error) {
            console.error('❌ Error releasing inventory reservations:', error);
            throw error;
        }
    }

    async finalizeOrderInventory(orderId) {
        const client = database.getClient();

        try {
            // Get order items
            const items = await client.execute(
                `SELECT * FROM ${this.orderItemsTable} WHERE order_id = ?`,
                [orderId]
            );

            // Convert reservations to actual sales
            const finalizePromises = items.rows.map(item =>
                this.convertReservationToSale(item.product_id, item.quantity_ordered, orderId)
            );

            await Promise.all(finalizePromises);
            console.log(`✅ Inventory finalized for delivered order ${orderId}`);

        } catch (error) {
            console.error('❌ Error finalizing inventory:', error);
            throw error;
        }
    }

    async convertReservationToSale(productId, quantity, orderId) {
        const client = database.getClient();
        const now = new Date();
        const movementDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            const batch = [
                // Reduce reserved quantity (inventory was already deducted when reserved)
                {
                    query: `UPDATE product_inventory
                            SET quantity_reserved = quantity_reserved - ?
                            WHERE product_id = ?`,
                    params: [quantity, productId]
                },
                // Update product purchase counter
                {
                    query: `UPDATE ${this.productsTable}
                            SET purchase_count = purchase_count + ?
                            WHERE product_id = ?`,
                    params: [quantity, productId]
                },
                // Log final inventory movement
                {
                    query: `INSERT INTO inventory_movements
                            (product_id, movement_date, movement_timestamp, movement_id, movement_type,
                             quantity_change, reference_id, reference_type, created_by_type, source_system)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        productId, movementDate, now, cassandra.types.TimeUuid.now(),
                        'sale', -quantity, orderId, 'order', 'system', 'ecommerce'
                    ]
                }
            ];

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.quorum
            });

        } catch (error) {
            console.error('❌ Error converting reservation to sale:', error);
            throw error;
        }
    }

    // ===================================
    // ORDER ANALYTICS
    // ===================================

    async recordOrderAnalytics(order) {
        const client = database.getClient();
        const orderDate = new Date(order.created_at.getFullYear(), order.created_at.getMonth(), order.created_at.getDate());
        const hourBucket = order.created_at.getHours();

        try {
            // Update daily order statistics
            const batch = [
                {
                    query: `UPDATE ${this.dailyOrderStatsTable}
                            SET order_count = order_count + 1,
                                revenue_cents = revenue_cents + ?
                            WHERE stats_date = ? AND hour_bucket = ? AND datacenter = ?`,
                    params: [order.total_cents, orderDate, hourBucket, 'datacenter1']
                }
            ];

            // Update customer analytics
            const isNewCustomer = await this.isNewCustomer(order.customer_id);
            batch.push({
                query: `UPDATE ${this.dailyOrderStatsTable}
                        SET ${isNewCustomer ? 'new_customers' : 'returning_customers'} = ${isNewCustomer ? 'new_customers' : 'returning_customers'} + 1
                        WHERE stats_date = ? AND hour_bucket = ? AND datacenter = ?`,
                params: [orderDate, hourBucket, 'datacenter1']
            });

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.one // Analytics can be eventually consistent
            });

        } catch (error) {
            console.error('❌ Error recording order analytics:', error);
            // Don't throw - analytics failure shouldn't break order creation
        }
    }

    // ===================================
    // UTILITY METHODS
    // ===================================

    calculateCartTotals(items) {
        const subtotal = items.reduce((sum, item) => sum + item.line_total_cents, 0);
        const tax = Math.round(subtotal * 0.08); // 8% tax example
        const shipping = this.calculateShipping(subtotal);

        return {
            subtotal_cents: subtotal,
            tax_cents: tax,
            shipping_cents: shipping,
            total_cents: subtotal + tax + shipping
        };
    }

    calculateOrderTotals(items, orderData) {
        const subtotal = items.reduce((sum, item) => sum + item.line_total_cents, 0);
        const tax = orderData.taxCents || Math.round(subtotal * 0.08);
        const shipping = orderData.shippingCents || this.calculateShipping(subtotal);
        const discount = orderData.discountCents || 0;

        return {
            subtotal: subtotal,
            tax: tax,
            shipping: shipping,
            discount: discount,
            total: subtotal + tax + shipping - discount
        };
    }

    calculateShipping(subtotalCents) {
        // Simple shipping calculation
        if (subtotalCents >= 5000) return 0;        // Free shipping over $50
        if (subtotalCents >= 2500) return 500;      // $5 shipping $25-$50
        return 1000;                                // $10 shipping under $25
    }

    generateOrderSummary(items) {
        if (items.length === 0) return 'Empty order';
        if (items.length === 1) return items[0].product_name;
        if (items.length <= 3) {
            return items.map(item => item.product_name).join(', ');
        }
        return `${items[0].product_name} and ${items.length - 1} other items`;
    }

    async generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = Date.now().toString().slice(-6);

        return `ORD-${year}${month}${day}-${timestamp}`;
    }

    async clearCart(cartId) {
        const client = database.getClient();

        try {
            // Set cart TTL to 1 second to expire immediately
            await client.execute(
                `UPDATE ${this.shoppingCartsTable}
                 SET cart_status = ?
                 WHERE cart_id = ?
                 USING TTL ?`,
                ['converted', cartId, 1]
            );

            // Clear cart items
            await client.execute(
                `DELETE FROM ${this.cartItemsTable} WHERE cart_id = ?`,
                [cartId]
            );

        } catch (error) {
            console.error('❌ Error clearing cart:', error);
            throw error;
        }
    }

    async isNewCustomer(customerId) {
        const client = database.getClient();

        try {
            const result = await client.execute(
                `SELECT total_orders FROM users WHERE user_id = ?`,
                [customerId]
            );

            return (result.rows[0]?.total_orders || 0) <= 1;

        } catch (error) {
            console.error('❌ Error checking if new customer:', error);
            return false;
        }
    }

    async updateCustomerOrderCounters(customerId, orderTotalCents) {
        const client = database.getClient();

        try {
            await client.execute(
                `UPDATE users
                 SET total_orders = total_orders + 1, total_spent = total_spent + ?
                 WHERE user_id = ?`,
                [orderTotalCents, customerId],
                { consistency: database.consistencyLevels.one }
            );

        } catch (error) {
            console.error('❌ Error updating customer counters:', error);
            // Don't throw - counter failures shouldn't break order creation
        }
    }
}

module.exports = new EcommerceOrder();
