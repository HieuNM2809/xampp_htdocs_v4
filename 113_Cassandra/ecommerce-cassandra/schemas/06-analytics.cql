-- ===================================
-- ANALYTICS & REPORTING TABLES
-- ===================================

USE ecommerce;

-- ===================================
-- 1. SALES ANALYTICS (Time-series)
-- ===================================

CREATE TABLE sales_analytics (
    analytics_date DATE,
    time_bucket TIMESTAMP,     -- Rounded to hour/minute for granular analysis
    dimension_type TEXT,       -- 'product', 'category', 'brand', 'region', 'channel'
    dimension_value TEXT,      -- Actual value (product_id, category_name, etc.)

    -- Sales metrics
    orders_count COUNTER,
    revenue_cents COUNTER,
    units_sold COUNTER,
    unique_customers COUNTER,

    -- Performance metrics
    conversion_rate DECIMAL,   -- Updated periodically
    avg_order_value_cents BIGINT,
    cart_abandonment_rate DECIMAL,

    -- Customer analytics
    new_customers COUNTER,
    returning_customers COUNTER,
    customer_lifetime_value_cents BIGINT,

    -- Product performance
    top_selling_products MAP<TEXT, INT>,      -- product_id -> units_sold
    trending_categories MAP<TEXT, DECIMAL>,   -- category_id -> trend_score

    PRIMARY KEY ((analytics_date, dimension_type), time_bucket, dimension_value)
) WITH CLUSTERING ORDER BY (time_bucket DESC, dimension_value ASC)
  AND default_time_to_live = 94608000;  -- 3 years analytics retention

-- ===================================
-- 2. USER BEHAVIOR ANALYTICS
-- ===================================

CREATE TABLE user_behavior_analytics (
    user_id UUID,
    behavior_date DATE,        -- Partition by date
    session_timestamp TIMESTAMP,
    session_id TEXT,

    -- Session metrics
    session_duration_seconds INT,
    pages_viewed INT,
    products_viewed INT,
    search_queries_count INT,

    -- Conversion funnel
    viewed_products LIST<UUID>,
    added_to_cart LIST<UUID>,
    purchased_products LIST<UUID>,
    abandoned_cart_items LIST<UUID>,

    -- Engagement metrics
    bounce_rate DECIMAL,       -- Did user leave quickly?
    time_on_product_pages INT, -- Seconds spent on product pages
    search_to_purchase_time INT, -- Time from search to purchase

    -- Device/context
    device_type TEXT,          -- 'desktop', 'mobile', 'tablet'
    traffic_source TEXT,       -- 'direct', 'search', 'social', 'email'
    utm_campaign TEXT,
    referrer TEXT,

    -- Geographic
    country TEXT,
    region TEXT,
    city TEXT,

    -- Personalization data
    category_preferences MAP<TEXT, DECIMAL>, -- category_id -> preference_score
    brand_affinity MAP<TEXT, DECIMAL>,       -- brand -> affinity_score
    price_sensitivity DECIMAL,               -- User's price sensitivity

    PRIMARY KEY ((user_id, behavior_date), session_timestamp, session_id)
) WITH CLUSTERING ORDER BY (session_timestamp DESC, session_id ASC)
  AND default_time_to_live = 7776000;  -- 90 days behavioral data

-- ===================================
-- 3. PRODUCT PERFORMANCE ANALYTICS
-- ===================================

CREATE TABLE product_performance (
    product_id UUID,
    analytics_date DATE,
    hour_bucket INT,           -- 0-23 for hourly breakdown

    -- View metrics
    page_views COUNTER,
    unique_viewers COUNTER,
    avg_time_on_page_seconds INT,
    bounce_rate DECIMAL,

    -- Conversion funnel
    add_to_cart_count COUNTER,
    remove_from_cart_count COUNTER,
    purchase_count COUNTER,
    wishlist_additions COUNTER,

    -- Conversion rates (calculated periodically)
    view_to_cart_rate DECIMAL,
    cart_to_purchase_rate DECIMAL,
    overall_conversion_rate DECIMAL,

    -- Revenue metrics
    revenue_cents COUNTER,
    units_sold COUNTER,
    refunds_cents COUNTER,
    profit_cents COUNTER,      -- Revenue - cost

    -- Customer metrics
    returning_customer_purchases COUNTER,
    new_customer_purchases COUNTER,
    avg_customer_rating DECIMAL,

    -- Search performance
    search_result_clicks COUNTER,
    search_result_position_avg DECIMAL,

    PRIMARY KEY ((product_id, analytics_date), hour_bucket)
) WITH CLUSTERING ORDER BY (hour_bucket DESC)
  AND default_time_to_live = 15552000;  -- 6 months detailed analytics

-- ===================================
-- 4. SEARCH ANALYTICS
-- ===================================

CREATE TABLE search_analytics (
    search_date DATE,
    search_timestamp TIMESTAMP,
    search_id TIMEUUID,

    -- Search query details
    search_query TEXT,         -- Original search term
    normalized_query TEXT,     -- Cleaned/normalized version
    search_type TEXT,          -- 'text', 'category', 'brand', 'filter'

    -- Search context
    user_id UUID,             -- NULL for guest searches
    session_id TEXT,

    -- Search results
    results_count INT,         -- Number of results returned
    results_clicked LIST<UUID>, -- Products clicked from results
    first_click_position INT,  -- Position of first clicked result

    -- User interaction
    search_to_purchase_minutes INT, -- Time from search to purchase
    purchase_made BOOLEAN,
    purchased_product_ids SET<UUID>,

    -- Search refinement
    filters_applied MAP<TEXT, TEXT>, -- Applied filters
    sort_order TEXT,
    results_page_viewed INT,    -- How far user paginated

    -- Performance
    search_duration_ms INT,    -- Time to execute search
    search_source TEXT,        -- 'autocomplete', 'manual', 'suggestion'

    PRIMARY KEY ((search_date), search_timestamp, search_id)
) WITH CLUSTERING ORDER BY (search_timestamp DESC, search_id DESC)
  AND default_time_to_live = 7776000;  -- 90 days search analytics

-- ===================================
-- 5. POPULAR SEARCH TERMS (Real-time)
-- ===================================

CREATE TABLE popular_searches (
    search_term TEXT,
    time_window TEXT,          -- '2023-12-01-10' (date-hour format)

    -- Search statistics
    search_count COUNTER,
    unique_searchers COUNTER,
    click_through_rate DECIMAL, -- Updated periodically

    -- Result quality metrics
    avg_results_count DECIMAL,
    zero_results_count COUNTER,
    successful_searches COUNTER, -- Searches that led to clicks

    -- Trend analysis
    trend_score DECIMAL,       -- Trending factor
    search_velocity DECIMAL,   -- Rate of increase

    PRIMARY KEY (search_term, time_window)
) WITH default_time_to_live = 2592000;  -- 30 days trending data

-- ===================================
-- 6. CUSTOMER LIFETIME VALUE (CLV)
-- ===================================

CREATE TABLE customer_lifetime_value (
    user_id UUID PRIMARY KEY,

    -- Financial metrics
    total_revenue_cents BIGINT,
    total_orders INT,
    avg_order_value_cents BIGINT,
    total_profit_cents BIGINT,

    -- Behavioral metrics
    purchase_frequency_days DECIMAL, -- Average days between purchases
    customer_lifespan_days INT,      -- Days since first purchase
    recency_score DECIMAL,           -- 0-1, how recently they purchased
    frequency_score DECIMAL,         -- 0-1, how frequently they purchase
    monetary_score DECIMAL,          -- 0-1, how much they spend

    -- Engagement metrics
    email_engagement_rate DECIMAL,
    website_session_count INT,
    product_reviews_count INT,
    referrals_count INT,

    -- Prediction metrics
    predicted_next_purchase_date DATE,
    churn_risk_score DECIMAL,        -- 0-1, probability of churning
    predicted_lifetime_value_cents BIGINT,

    -- Segmentation
    customer_segment TEXT,     -- 'high_value', 'at_risk', 'new', 'loyal', 'dormant'
    segment_updated_at TIMESTAMP,

    -- Last calculation
    calculated_at TIMESTAMP,
    calculation_version TEXT   -- Track which algorithm version was used
);

-- ===================================
-- 7. CONVERSION FUNNEL ANALYTICS
-- ===================================

CREATE TABLE conversion_funnel (
    funnel_date DATE,
    funnel_step TEXT,          -- 'homepage', 'category', 'product', 'cart', 'checkout', 'purchase'
    user_segment TEXT,         -- 'new', 'returning', 'premium', etc.
    traffic_source TEXT,       -- 'organic', 'paid', 'social', 'email', 'direct'

    -- Funnel metrics
    users_entered COUNTER,     -- Users entering this step
    users_completed COUNTER,   -- Users completing this step
    users_dropped COUNTER,     -- Users dropping at this step

    -- Time metrics
    avg_time_spent_seconds INT,
    median_time_to_next_step_seconds INT,

    -- Conversion rates (calculated periodically)
    step_conversion_rate DECIMAL,
    overall_conversion_rate DECIMAL,
    drop_off_rate DECIMAL,

    PRIMARY KEY ((funnel_date, funnel_step), user_segment, traffic_source)
) WITH CLUSTERING ORDER BY (user_segment ASC, traffic_source ASC);

-- ===================================
-- 8. REVENUE ANALYTICS (Financial reporting)
-- ===================================

CREATE TABLE revenue_analytics (
    period_type TEXT,          -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    period_start_date DATE,
    dimension_type TEXT,       -- 'total', 'category', 'brand', 'region', 'channel'
    dimension_value TEXT,

    -- Core revenue metrics
    gross_revenue_cents COUNTER,
    net_revenue_cents COUNTER,    -- After refunds/returns
    cost_of_goods_cents COUNTER,
    gross_profit_cents COUNTER,

    -- Order metrics
    total_orders COUNTER,
    avg_order_value_cents BIGINT,
    median_order_value_cents BIGINT,

    -- Customer metrics
    unique_customers COUNTER,
    new_customers COUNTER,
    returning_customers COUNTER,

    -- Product metrics
    units_sold COUNTER,
    returns_count COUNTER,
    return_rate DECIMAL,

    -- Geographic breakdown
    revenue_by_country MAP<TEXT, BIGINT>,
    orders_by_country MAP<TEXT, INT>,

    PRIMARY KEY ((period_type, period_start_date), dimension_type, dimension_value)
) WITH CLUSTERING ORDER BY (dimension_type ASC, dimension_value ASC);

-- ===================================
-- INDEXES FOR ANALYTICS QUERIES
-- ===================================

-- Time-based analytics queries
CREATE INDEX analytics_time_idx ON sales_analytics (time_bucket);

-- User behavior queries
CREATE INDEX behavior_user_idx ON user_behavior_analytics (user_id);

-- Product performance queries
CREATE INDEX performance_product_idx ON product_performance (product_id);

-- Search term analysis
CREATE INDEX popular_search_idx ON popular_searches (search_term);

-- Customer segment analysis
CREATE INDEX clv_segment_idx ON customer_lifetime_value (customer_segment);

-- ===================================
-- MATERIALIZED VIEWS (Auto-maintained aggregations)
-- Note: Use with caution in production - they have performance overhead
-- ===================================

-- Real-time product rankings (updated automatically)
-- CREATE MATERIALIZED VIEW top_selling_products AS
--     SELECT product_id, purchase_count, rating_sum, rating_count
--     FROM products
--     WHERE product_id IS NOT NULL AND purchase_count IS NOT NULL
--     PRIMARY KEY (purchase_count, product_id)
--     WITH CLUSTERING ORDER BY (purchase_count DESC);

-- ===================================
-- SAMPLE ANALYTICS QUERIES
-- ===================================

-- Daily sales summary
-- SELECT SUM(orders_count), SUM(revenue_cents) FROM sales_analytics WHERE analytics_date = '2023-12-01';

-- Product performance for a specific product
-- SELECT * FROM product_performance WHERE product_id = ? AND analytics_date >= '2023-12-01';

-- Customer behavior analysis
-- SELECT COUNT(*) FROM user_behavior_analytics WHERE behavior_date = '2023-12-01' AND bounce_rate < 0.5;
