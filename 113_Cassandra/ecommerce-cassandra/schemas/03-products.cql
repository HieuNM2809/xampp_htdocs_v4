-- ===================================
-- PRODUCT CATALOG TABLES
-- ===================================

USE ecommerce;

-- ===================================
-- 1. PRODUCTS (Main product data)
-- ===================================

CREATE TABLE products (
    product_id UUID PRIMARY KEY,
    sku TEXT,                    -- Stock Keeping Unit

    -- Basic product info
    name TEXT,
    description TEXT,
    short_description TEXT,
    brand TEXT,
    manufacturer TEXT,

    -- Categorization
    primary_category_id UUID,
    category_path LIST<TEXT>,    -- ['Electronics', 'Computers', 'Laptops']
    tags SET<TEXT>,             -- Search tags

    -- Pricing (stored in cents to avoid decimal precision issues)
    price_cents BIGINT,         -- Current price in cents
    original_price_cents BIGINT, -- MSRP
    cost_cents BIGINT,          -- Cost price (for profit calculations)
    currency TEXT,

    -- Product specifications
    specifications MAP<TEXT, TEXT>, -- {'weight': '2.5kg', 'color': 'black', 'size': 'M'}
    dimensions MAP<TEXT, DECIMAL>,  -- {'length': 30.5, 'width': 20.0, 'height': 15.0}

    -- Media
    primary_image TEXT,         -- Primary product image URL
    image_urls LIST<TEXT>,      -- Additional images
    video_urls LIST<TEXT>,      -- Product videos

    -- Status
    product_status TEXT,        -- 'active', 'inactive', 'discontinued', 'draft'
    availability_status TEXT,   -- 'in_stock', 'low_stock', 'out_of_stock', 'preorder'

    -- SEO
    seo_title TEXT,
    seo_description TEXT,
    url_slug TEXT,

    -- Timestamps
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    -- Statistics (counters for real-time updates)
    view_count COUNTER,
    purchase_count COUNTER,
    rating_sum COUNTER,         -- Sum of all ratings
    rating_count COUNTER,       -- Number of ratings
    wishlist_count COUNTER
);

-- ===================================
-- 2. PRODUCTS BY CATEGORY (Query: Browse category)
-- ===================================

CREATE TABLE products_by_category (
    category_id UUID,
    price_range TEXT,           -- 'under_50', '50_100', '100_500', 'over_500'
    popularity_score DECIMAL,   -- Calculated score for sorting
    product_id UUID,

    -- Denormalized product data for fast display
    name TEXT,
    short_description TEXT,
    brand TEXT,
    price_cents BIGINT,
    original_price_cents BIGINT,
    primary_image TEXT,
    availability_status TEXT,

    -- Quick stats
    rating_average DECIMAL,     -- Calculated from rating_sum/rating_count
    review_count INT,

    -- Metadata
    created_at TIMESTAMP,

    PRIMARY KEY (category_id, price_range, popularity_score, product_id)
) WITH CLUSTERING ORDER BY (price_range ASC, popularity_score DESC, product_id ASC);

-- ===================================
-- 3. PRODUCTS BY BRAND (Query: Browse by brand)
-- ===================================

CREATE TABLE products_by_brand (
    brand TEXT,
    category_id UUID,
    created_at TIMESTAMP,
    product_id UUID,

    -- Denormalized product data
    name TEXT,
    price_cents BIGINT,
    primary_image TEXT,
    availability_status TEXT,
    rating_average DECIMAL,

    PRIMARY KEY (brand, category_id, created_at, product_id)
) WITH CLUSTERING ORDER BY (category_id ASC, created_at DESC, product_id ASC);

-- ===================================
-- 4. PRODUCT SEARCH (Text search support)
-- ===================================

CREATE TABLE product_search_index (
    search_term TEXT,           -- Normalized search term
    relevance_score DECIMAL,    -- Search relevance (0.0 to 1.0)
    product_id UUID,

    -- Denormalized for search results
    name TEXT,
    brand TEXT,
    price_cents BIGINT,
    primary_image TEXT,
    availability_status TEXT,
    category_path LIST<TEXT>,

    -- Search metadata
    indexed_at TIMESTAMP,

    PRIMARY KEY (search_term, relevance_score, product_id)
) WITH CLUSTERING ORDER BY (relevance_score DESC, product_id ASC);

-- ===================================
-- 5. PRODUCT PRICE HISTORY (Time-series)
-- ===================================

CREATE TABLE product_price_history (
    product_id UUID,
    price_date DATE,            -- Bucket by date
    price_timestamp TIMESTAMP,
    price_change_id TIMEUUID,

    -- Price data
    old_price_cents BIGINT,
    new_price_cents BIGINT,
    change_reason TEXT,         -- 'promotion', 'cost_change', 'competitive_adjustment'
    change_percentage DECIMAL,

    -- Context
    changed_by UUID,            -- Admin user who made the change
    promotion_id UUID,          -- If part of a promotion

    PRIMARY KEY ((product_id, price_date), price_timestamp, price_change_id)
) WITH CLUSTERING ORDER BY (price_timestamp DESC, price_change_id DESC)
  AND default_time_to_live = 31536000;  -- 1 year price history

-- ===================================
-- 6. PRODUCT REVIEWS
-- ===================================

CREATE TABLE product_reviews (
    product_id UUID,
    review_date DATE,           -- Partition by date for better distribution
    review_timestamp TIMESTAMP,
    review_id TIMEUUID,

    -- Review data
    user_id UUID,
    user_name TEXT,             -- Denormalized
    rating INT,                 -- 1-5 stars
    title TEXT,
    review_text TEXT,

    -- Review metadata
    verified_purchase BOOLEAN,
    helpful_count COUNTER,
    reported_count COUNTER,
    review_status TEXT,         -- 'approved', 'pending', 'rejected'

    -- Additional data
    purchase_date DATE,         -- When reviewer purchased the product
    usage_duration INT,         -- Days between purchase and review

    -- Media attachments
    review_images LIST<TEXT>,
    review_videos LIST<TEXT>,

    PRIMARY KEY ((product_id, review_date), review_timestamp, review_id)
) WITH CLUSTERING ORDER BY (review_timestamp DESC, review_id DESC);

-- ===================================
-- 7. PRODUCT INVENTORY SNAPSHOTS
-- ===================================

CREATE TABLE product_inventory (
    product_id UUID PRIMARY KEY,

    -- Stock levels
    quantity_available INT,
    quantity_reserved INT,      -- Reserved for pending orders
    quantity_incoming INT,      -- Expected from suppliers

    -- Inventory thresholds
    low_stock_threshold INT,
    reorder_point INT,
    max_stock_level INT,

    -- Supplier information
    primary_supplier_id UUID,
    supplier_sku TEXT,
    lead_time_days INT,

    -- Cost information
    unit_cost_cents BIGINT,
    last_cost_update TIMESTAMP,

    -- Location tracking
    warehouse_locations MAP<TEXT, INT>, -- {'warehouse_a': 100, 'warehouse_b': 50}

    -- Inventory status
    inventory_status TEXT,      -- 'normal', 'low', 'critical', 'out_of_stock'
    last_restock_date DATE,
    next_expected_restock DATE,

    -- Tracking
    last_updated TIMESTAMP,
    updated_by UUID            -- Which system/user updated inventory
);

-- ===================================
-- 8. PRODUCT CATEGORIES
-- ===================================

CREATE TABLE product_categories (
    category_id UUID PRIMARY KEY,

    -- Category hierarchy
    parent_category_id UUID,
    category_level INT,         -- 0=root, 1=main category, 2=subcategory, etc.
    category_path LIST<UUID>,   -- Full path from root

    -- Category information
    name TEXT,
    description TEXT,
    display_name TEXT,
    url_slug TEXT,

    -- SEO
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords SET<TEXT>,

    -- Display settings
    category_image TEXT,
    icon_url TEXT,
    display_order INT,
    is_featured BOOLEAN,

    -- Category status
    status TEXT,               -- 'active', 'inactive', 'hidden'

    -- Statistics
    product_count COUNTER,

    -- Timestamps
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- ===================================
-- 9. PRODUCT VARIANTS (for products with sizes, colors, etc.)
-- ===================================

CREATE TABLE product_variants (
    product_id UUID,
    variant_id UUID,

    -- Variant attributes
    variant_type TEXT,         -- 'size', 'color', 'material'
    variant_value TEXT,        -- 'Large', 'Red', 'Cotton'
    variant_sku TEXT,          -- Unique SKU for this variant

    -- Variant-specific data
    price_adjustment_cents BIGINT, -- Price difference from base product
    weight_grams INT,
    dimensions MAP<TEXT, DECIMAL>,

    -- Inventory for this variant
    quantity_available INT,

    -- Display
    variant_image TEXT,
    display_order INT,
    is_default BOOLEAN,        -- Default variant selection

    -- Status
    variant_status TEXT,       -- 'active', 'inactive', 'discontinued'

    created_at TIMESTAMP,

    PRIMARY KEY (product_id, variant_id)
) WITH CLUSTERING ORDER BY (variant_id ASC);

-- ===================================
-- INDEXES FOR PRODUCT QUERIES
-- ===================================

-- SKU lookup (unique identifier)
CREATE INDEX product_sku_idx ON products (sku);

-- URL slug lookup (for SEO-friendly URLs)
CREATE INDEX product_slug_idx ON products (url_slug);

-- Status queries (admin operations)
CREATE INDEX product_status_idx ON products (product_status);

-- Brand queries
CREATE INDEX product_brand_idx ON products (brand);

-- Category hierarchy lookups
CREATE INDEX category_parent_idx ON product_categories (parent_category_id);

-- Category slug lookups
CREATE INDEX category_slug_idx ON product_categories (url_slug);

-- Review user lookups (admin moderation)
CREATE INDEX review_user_idx ON product_reviews (user_id);

-- Variant SKU lookups
CREATE INDEX variant_sku_idx ON product_variants (variant_sku);

-- ===================================
-- SAMPLE VERIFICATION QUERIES
-- ===================================

-- These queries will be used to verify the schema works correctly
-- SELECT COUNT(*) FROM products;
-- SELECT COUNT(*) FROM product_categories;
-- SELECT COUNT(*) FROM product_reviews;
-- SELECT COUNT(*) FROM product_variants;
