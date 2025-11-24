-- ===================================
-- ORDER MANAGEMENT TABLES
-- ===================================

USE ecommerce;

-- ===================================
-- 1. ORDERS (Main order data)
-- ===================================

CREATE TABLE orders (
    order_id UUID PRIMARY KEY,

    -- Customer information (denormalized for performance)
    customer_id UUID,
    customer_email TEXT,
    customer_name TEXT,
    customer_phone TEXT,

    -- Order details
    order_number TEXT,          -- Human-readable order number (ORD-2023-123456)
    order_status TEXT,          -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    order_type TEXT,            -- 'standard', 'express', 'bulk', 'subscription'

    -- Pricing (all in cents)
    subtotal_cents BIGINT,      -- Sum of line items
    tax_cents BIGINT,           -- Tax amount
    shipping_cents BIGINT,      -- Shipping cost
    discount_cents BIGINT,      -- Total discounts applied
    total_cents BIGINT,         -- Final total
    currency TEXT,

    -- Payment information
    payment_status TEXT,        -- 'pending', 'authorized', 'captured', 'failed', 'refunded'
    payment_method TEXT,        -- 'credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'
    payment_reference TEXT,     -- External payment system reference

    -- Shipping information (denormalized)
    shipping_address MAP<TEXT, TEXT>, -- Full address in one field
    billing_address MAP<TEXT, TEXT>,
    shipping_method TEXT,       -- 'standard', 'express', 'overnight'
    tracking_number TEXT,
    estimated_delivery DATE,
    actual_delivery_date DATE,

    -- Order metadata
    order_source TEXT,          -- 'web', 'mobile', 'api', 'admin'
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,

    -- Promotions applied
    promotion_codes SET<TEXT>,
    loyalty_points_used INT,
    loyalty_points_earned INT,

    -- Timestamps
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- ===================================
-- 2. ORDERS BY USER (Query: User's order history)
-- ===================================

CREATE TABLE orders_by_user (
    user_id UUID,
    order_date DATE,            -- Partition by date for better distribution
    created_at TIMESTAMP,
    order_id UUID,

    -- Denormalized order data for quick display
    order_number TEXT,
    order_status TEXT,
    total_cents BIGINT,
    currency TEXT,
    item_count INT,             -- Number of items in order

    -- Quick order summary
    primary_product_names LIST<TEXT>,  -- First few product names
    order_summary TEXT,         -- "3 items: iPhone, Case, Screen Protector"

    -- Status tracking
    estimated_delivery DATE,
    tracking_number TEXT,

    PRIMARY KEY ((user_id, order_date), created_at, order_id)
) WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);

-- ===================================
-- 3. ORDER ITEMS (Order line items)
-- ===================================

CREATE TABLE order_items (
    order_id UUID,
    line_item_id UUID,

    -- Product information (denormalized)
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    variant_id UUID,
    variant_description TEXT,   -- 'Size: Large, Color: Red'

    -- Pricing per item (in cents)
    unit_price_cents BIGINT,
    unit_cost_cents BIGINT,     -- For profit calculations

    -- Quantity
    quantity_ordered INT,
    quantity_shipped INT,       -- For partial shipments
    quantity_cancelled INT,     -- For partial cancellations

    -- Line totals (in cents)
    line_subtotal_cents BIGINT, -- unit_price * quantity_ordered
    line_discount_cents BIGINT, -- Discounts applied to this line
    line_total_cents BIGINT,    -- Final line total

    -- Item-specific information
    product_customizations MAP<TEXT, TEXT>, -- Custom engraving, etc.
    gift_wrap BOOLEAN,
    gift_message TEXT,

    -- Fulfillment tracking
    item_status TEXT,           -- 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
    warehouse_location TEXT,
    shipped_at TIMESTAMP,
    tracking_number TEXT,       -- Can be different per item

    -- Timestamps
    created_at TIMESTAMP,

    PRIMARY KEY (order_id, line_item_id)
) WITH CLUSTERING ORDER BY (line_item_id ASC);

-- ===================================
-- 4. ORDER STATUS HISTORY (Audit trail)
-- ===================================

CREATE TABLE order_status_history (
    order_id UUID,
    status_timestamp TIMESTAMP,
    status_change_id TIMEUUID,

    -- Status change details
    old_status TEXT,
    new_status TEXT,
    change_reason TEXT,
    change_note TEXT,

    -- Who made the change
    changed_by UUID,            -- User ID (customer or admin)
    changed_by_type TEXT,       -- 'customer', 'admin', 'system', 'external'
    change_source TEXT,         -- 'web', 'mobile', 'api', 'webhook'

    -- Additional context
    ip_address INET,
    session_id TEXT,
    external_reference TEXT,    -- Reference from shipping provider, payment processor

    PRIMARY KEY (order_id, status_timestamp, status_change_id)
) WITH CLUSTERING ORDER BY (status_timestamp DESC, status_change_id DESC);

-- ===================================
-- 5. SHOPPING CARTS (with TTL)
-- ===================================

CREATE TABLE shopping_carts (
    cart_id UUID PRIMARY KEY,

    -- Cart ownership
    user_id UUID,              -- NULL for guest carts
    session_id TEXT,            -- For guest/anonymous carts

    -- Cart metadata
    cart_status TEXT,          -- 'active', 'abandoned', 'converted', 'saved_for_later'
    currency TEXT,

    -- Cart totals (calculated in real-time)
    item_count INT,
    subtotal_cents BIGINT,
    estimated_tax_cents BIGINT,
    estimated_shipping_cents BIGINT,
    estimated_total_cents BIGINT,

    -- Cart context
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_activity TIMESTAMP,

    -- Device/session info
    device_info MAP<TEXT, TEXT>,
    user_agent TEXT,
    ip_address INET,

    -- Personalization
    applied_promotions SET<TEXT>,
    saved_for_later BOOLEAN,

    -- Marketing
    utm_source TEXT,           -- Marketing attribution
    utm_campaign TEXT,
    referrer TEXT

) WITH default_time_to_live = 2592000;  -- 30 days cart expiry

-- ===================================
-- 6. CART ITEMS
-- ===================================

CREATE TABLE cart_items (
    cart_id UUID,
    cart_item_id UUID,

    -- Product information (denormalized)
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    variant_id UUID,
    variant_description TEXT,

    -- Pricing (in cents, current prices)
    unit_price_cents BIGINT,
    line_total_cents BIGINT,

    -- Quantity
    quantity INT,
    max_quantity_allowed INT,   -- Stock availability at time of add

    -- Item customizations
    customizations MAP<TEXT, TEXT>,  -- Gift wrapping, engraving, etc.
    special_instructions TEXT,

    -- Item metadata
    added_at TIMESTAMP,
    updated_at TIMESTAMP,

    PRIMARY KEY (cart_id, cart_item_id)
) WITH CLUSTERING ORDER BY (cart_item_id ASC)
  AND default_time_to_live = 2592000;  -- 30 days expiry (same as cart)

-- ===================================
-- 7. ORDER ANALYTICS (Time-series for reporting)
-- ===================================

CREATE TABLE daily_order_stats (
    stats_date DATE,
    hour_bucket INT,           -- 0-23 for hourly breakdown
    datacenter TEXT,           -- Multi-region analytics

    -- Order statistics
    order_count COUNTER,
    revenue_cents COUNTER,
    avg_order_value_cents BIGINT, -- Calculated periodically

    -- Product performance
    top_products MAP<TEXT, INT>,   -- Product IDs -> quantity sold
    top_categories MAP<TEXT, INT>, -- Category IDs -> order count

    -- Customer analytics
    new_customers COUNTER,
    returning_customers COUNTER,

    -- Geographic breakdown
    orders_by_country MAP<TEXT, INT>,

    PRIMARY KEY (stats_date, hour_bucket, datacenter)
) WITH CLUSTERING ORDER BY (hour_bucket ASC, datacenter ASC);

-- ===================================
-- 8. ABANDONED CARTS (Marketing analytics)
-- ===================================

CREATE TABLE abandoned_cart_analysis (
    abandonment_date DATE,
    cart_id UUID,
    user_id UUID,

    -- Cart details at abandonment
    item_count INT,
    cart_value_cents BIGINT,
    time_spent_minutes INT,     -- Time from creation to abandonment

    -- Abandonment context
    last_page_viewed TEXT,
    exit_point TEXT,           -- 'product_page', 'cart_page', 'checkout_page'
    device_type TEXT,          -- 'desktop', 'mobile', 'tablet'

    -- Follow-up actions
    email_reminder_sent BOOLEAN,
    sms_reminder_sent BOOLEAN,
    recovered BOOLEAN,          -- Did user return to complete purchase?
    recovery_order_id UUID,

    -- Marketing attribution
    traffic_source TEXT,
    campaign_id TEXT,

    PRIMARY KEY (abandonment_date, cart_id)
) WITH CLUSTERING ORDER BY (cart_id ASC)
  AND default_time_to_live = 15552000;  -- 6 months analytics retention

-- ===================================
-- 9. WISHLISTS
-- ===================================

CREATE TABLE user_wishlists (
    user_id UUID,
    wishlist_id UUID,

    -- Wishlist details
    wishlist_name TEXT,
    wishlist_description TEXT,
    is_public BOOLEAN,
    is_default BOOLEAN,

    -- Wishlist metadata
    item_count INT,
    total_value_cents BIGINT,  -- Sum of all items

    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    PRIMARY KEY (user_id, wishlist_id)
) WITH CLUSTERING ORDER BY (wishlist_id ASC);

CREATE TABLE wishlist_items (
    wishlist_id UUID,
    product_id UUID,

    -- Product data (denormalized for display)
    product_name TEXT,
    product_image TEXT,
    current_price_cents BIGINT,
    availability_status TEXT,

    -- Wishlist item metadata
    added_at TIMESTAMP,
    priority INT,              -- User-defined priority 1-5
    notes TEXT,                -- User notes about the item

    -- Price tracking
    price_at_addition_cents BIGINT,
    price_drop_alert BOOLEAN,
    target_price_cents BIGINT, -- Alert when price drops below this

    PRIMARY KEY (wishlist_id, product_id)
) WITH CLUSTERING ORDER BY (product_id ASC);

-- ===================================
-- INDEXES FOR ORDER QUERIES
-- ===================================

-- Order number lookup (customer service)
CREATE INDEX order_number_idx ON orders (order_number);

-- Order status queries (admin dashboard)
CREATE INDEX order_status_idx ON orders (order_status);

-- Payment status queries (finance team)
CREATE INDEX payment_status_idx ON orders (payment_status);

-- Product performance queries
CREATE INDEX review_product_idx ON product_reviews (product_id);

-- Customer service queries
CREATE INDEX cart_session_idx ON shopping_carts (session_id);

-- ===================================
-- SAMPLE VERIFICATION QUERIES
-- ===================================

-- Verify table creation
-- SELECT COUNT(*) FROM orders;
-- SELECT COUNT(*) FROM order_items;
-- SELECT COUNT(*) FROM shopping_carts;
-- SELECT COUNT(*) FROM product_reviews;
