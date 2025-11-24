-- ===================================
-- INVENTORY MANAGEMENT TABLES
-- ===================================

USE ecommerce;

-- ===================================
-- 1. INVENTORY MOVEMENTS (Time-series audit trail)
-- ===================================

CREATE TABLE inventory_movements (
    product_id UUID,
    movement_date DATE,         -- Partition by date for performance
    movement_timestamp TIMESTAMP,
    movement_id TIMEUUID,

    -- Movement details
    movement_type TEXT,         -- 'purchase', 'sale', 'adjustment', 'transfer', 'return', 'damage'
    quantity_change INT,        -- Positive for incoming, negative for outgoing
    quantity_before INT,
    quantity_after INT,

    -- Movement context
    reference_id UUID,          -- Order ID, Purchase Order ID, etc.
    reference_type TEXT,        -- 'order', 'purchase_order', 'adjustment', 'transfer'

    -- Location tracking
    warehouse_id UUID,
    warehouse_location TEXT,    -- Denormalized warehouse info
    bin_location TEXT,          -- Specific storage location

    -- Transaction details
    unit_cost_cents BIGINT,     -- Cost per unit at time of transaction
    total_cost_cents BIGINT,    -- Total transaction value

    -- Metadata
    reason_code TEXT,           -- Specific reason for adjustment
    notes TEXT,
    batch_number TEXT,          -- For batch/lot tracking
    expiry_date DATE,           -- For perishable goods

    -- Audit trail
    created_by UUID,            -- User who performed the movement
    created_by_type TEXT,       -- 'admin', 'system', 'api', 'import'
    source_system TEXT,         -- 'pos', 'website', 'mobile_app', 'warehouse_system'

    PRIMARY KEY ((product_id, movement_date), movement_timestamp, movement_id)
) WITH CLUSTERING ORDER BY (movement_timestamp DESC, movement_id DESC)
  AND default_time_to_live = 94608000;  -- 3 years retention for audit

-- ===================================
-- 2. REAL-TIME INVENTORY STATUS
-- ===================================

CREATE TABLE inventory_status (
    product_id UUID PRIMARY KEY,

    -- Current stock levels
    quantity_on_hand INT,
    quantity_available INT,     -- on_hand - reserved - damaged
    quantity_reserved INT,      -- Reserved for pending orders
    quantity_damaged INT,       -- Damaged/unsellable inventory
    quantity_incoming INT,      -- Expected from purchase orders

    -- Inventory thresholds
    reorder_point INT,
    reorder_quantity INT,
    max_stock_level INT,
    safety_stock_level INT,

    -- Cost tracking
    current_cost_cents BIGINT, -- Current average cost
    last_cost_update TIMESTAMP,
    cost_method TEXT,          -- 'FIFO', 'LIFO', 'weighted_average'

    -- Supplier information (denormalized)
    primary_supplier_id UUID,
    primary_supplier_name TEXT,
    supplier_sku TEXT,
    lead_time_days INT,

    -- Location distribution
    warehouse_distribution MAP<TEXT, INT>, -- warehouse_id -> quantity

    -- Inventory alerts
    low_stock_alert BOOLEAN,
    out_of_stock_alert BOOLEAN,
    overstock_alert BOOLEAN,

    -- Performance metrics
    turnover_rate DECIMAL,     -- Annual inventory turnover
    days_of_supply INT,        -- Current supply in days

    -- Last movement tracking
    last_movement_type TEXT,
    last_movement_timestamp TIMESTAMP,
    last_updated TIMESTAMP,
    updated_by UUID
);

-- ===================================
-- 3. INVENTORY BY WAREHOUSE (Location-based queries)
-- ===================================

CREATE TABLE inventory_by_warehouse (
    warehouse_id UUID,
    location_zone TEXT,        -- 'A', 'B', 'C' zones within warehouse
    product_id UUID,

    -- Product info (denormalized)
    product_name TEXT,
    product_sku TEXT,
    category_name TEXT,

    -- Location-specific inventory
    quantity_on_hand INT,
    bin_locations SET<TEXT>,   -- Multiple storage locations

    -- Location metadata
    storage_requirements MAP<TEXT, TEXT>, -- temperature, humidity, etc.
    last_cycle_count_date DATE,
    cycle_count_variance INT,  -- Difference from last count

    -- Movement tracking
    last_in_timestamp TIMESTAMP,
    last_out_timestamp TIMESTAMP,

    PRIMARY KEY (warehouse_id, location_zone, product_id)
) WITH CLUSTERING ORDER BY (location_zone ASC, product_id ASC);

-- ===================================
-- 4. LOW STOCK ALERTS (Monitoring table)
-- ===================================

CREATE TABLE low_stock_alerts (
    alert_date DATE,
    severity_level INT,        -- 1=critical, 2=warning, 3=info
    alert_timestamp TIMESTAMP,
    alert_id TIMEUUID,

    -- Product information
    product_id UUID,
    product_name TEXT,         -- Denormalized
    product_sku TEXT,          -- Denormalized
    category_name TEXT,        -- Denormalized

    -- Stock information
    current_quantity INT,
    reorder_point INT,
    recommended_order_quantity INT,
    days_until_stockout INT,   -- Calculated based on sales velocity

    -- Business impact
    lost_sales_risk_cents BIGINT, -- Potential revenue at risk
    affected_orders_count INT,     -- Pending orders affected

    -- Supplier information
    primary_supplier_id UUID,
    supplier_name TEXT,        -- Denormalized
    lead_time_days INT,

    -- Alert handling
    alert_status TEXT,         -- 'new', 'acknowledged', 'action_taken', 'resolved'
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP,
    resolution_note TEXT,

    PRIMARY KEY ((alert_date, severity_level), alert_timestamp, alert_id)
) WITH CLUSTERING ORDER BY (alert_timestamp DESC, alert_id DESC)
  AND default_time_to_live = 7776000;  -- 90 days alert history

-- ===================================
-- 5. PURCHASE ORDERS (Supplier orders)
-- ===================================

CREATE TABLE purchase_orders (
    po_id UUID PRIMARY KEY,

    -- Supplier information (denormalized)
    supplier_id UUID,
    supplier_name TEXT,
    supplier_contact_info MAP<TEXT, TEXT>,

    -- PO details
    po_number TEXT,            -- Human-readable PO number
    po_status TEXT,            -- 'draft', 'sent', 'acknowledged', 'shipped', 'received', 'closed'
    po_type TEXT,              -- 'regular', 'emergency', 'consignment'

    -- Pricing
    subtotal_cents BIGINT,
    tax_cents BIGINT,
    shipping_cents BIGINT,
    total_cents BIGINT,
    currency TEXT,

    -- Delivery information
    requested_delivery_date DATE,
    promised_delivery_date DATE,
    actual_delivery_date DATE,
    delivery_address MAP<TEXT, TEXT>,

    -- Payment terms
    payment_terms TEXT,        -- 'NET30', 'NET60', '2/10 NET30'
    payment_status TEXT,       -- 'pending', 'paid', 'overdue'
    payment_due_date DATE,

    -- Metadata
    created_by UUID,
    approved_by UUID,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP,
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- ===================================
-- 6. PURCHASE ORDER ITEMS
-- ===================================

CREATE TABLE purchase_order_items (
    po_id UUID,
    line_item_id UUID,

    -- Product information
    product_id UUID,
    product_name TEXT,         -- Denormalized
    product_sku TEXT,          -- Denormalized
    supplier_sku TEXT,         -- Supplier's SKU for this product

    -- Order quantities
    quantity_ordered INT,
    quantity_received INT,
    quantity_pending INT,      -- Still to be received

    -- Pricing per item (in cents)
    unit_cost_cents BIGINT,
    line_total_cents BIGINT,

    -- Quality control
    quality_check_status TEXT, -- 'pending', 'passed', 'failed', 'partial'
    quality_notes TEXT,
    rejected_quantity INT,

    -- Receiving tracking
    received_date DATE,
    received_by UUID,
    batch_number TEXT,
    expiry_date DATE,

    PRIMARY KEY (po_id, line_item_id)
) WITH CLUSTERING ORDER BY (line_item_id ASC);

-- ===================================
-- 7. STOCK ADJUSTMENTS (Manual corrections)
-- ===================================

CREATE TABLE stock_adjustments (
    adjustment_date DATE,
    adjustment_timestamp TIMESTAMP,
    adjustment_id TIMEUUID,

    -- Product being adjusted
    product_id UUID,
    product_name TEXT,         -- Denormalized
    warehouse_id UUID,

    -- Adjustment details
    adjustment_type TEXT,      -- 'count_correction', 'damage', 'theft', 'found', 'expired'
    quantity_adjustment INT,   -- Can be positive or negative
    quantity_before INT,
    quantity_after INT,

    -- Financial impact
    cost_impact_cents BIGINT, -- Financial impact of adjustment

    -- Justification
    reason_code TEXT,
    detailed_reason TEXT,
    supporting_documents LIST<TEXT>, -- URLs to supporting documents

    -- Approval workflow
    adjustment_status TEXT,    -- 'pending', 'approved', 'rejected'
    requested_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP,

    PRIMARY KEY ((adjustment_date), adjustment_timestamp, adjustment_id)
) WITH CLUSTERING ORDER BY (adjustment_timestamp DESC, adjustment_id DESC)
  AND default_time_to_live = 94608000;  -- 3 years for audit compliance

-- ===================================
-- 8. INVENTORY FORECASTING (Analytics support)
-- ===================================

CREATE TABLE inventory_forecast (
    product_id UUID,
    forecast_date DATE,
    forecast_period TEXT,      -- 'weekly', 'monthly', 'quarterly'

    -- Demand forecasting
    predicted_demand INT,      -- Predicted units to be sold
    confidence_level DECIMAL,  -- 0.0 to 1.0 confidence in prediction
    forecast_method TEXT,      -- 'moving_average', 'exponential_smoothing', 'ml_model'

    -- Supply planning
    recommended_order_quantity INT,
    recommended_order_date DATE,
    stock_out_risk DECIMAL,    -- Probability of stockout

    -- Historical context
    historical_sales_30d INT,
    historical_sales_90d INT,
    seasonal_factor DECIMAL,   -- Seasonal adjustment factor
    trend_factor DECIMAL,      -- Trend adjustment factor

    -- External factors
    promotion_impact_factor DECIMAL,
    market_conditions MAP<TEXT, DECIMAL>,

    -- Forecast accuracy (updated after actual sales)
    actual_demand INT,         -- Actual sales for the period
    forecast_accuracy DECIMAL, -- How accurate was the forecast

    PRIMARY KEY (product_id, forecast_date, forecast_period)
) WITH CLUSTERING ORDER BY (forecast_date DESC, forecast_period ASC);

-- ===================================
-- INDEXES FOR INVENTORY QUERIES
-- ===================================

-- Purchase order number lookup
CREATE INDEX po_number_idx ON purchase_orders (po_number);

-- Supplier queries
CREATE INDEX po_supplier_idx ON purchase_orders (supplier_id);

-- Warehouse-specific queries
CREATE INDEX inventory_warehouse_idx ON inventory_by_warehouse (warehouse_id);

-- Low stock monitoring
CREATE INDEX low_stock_product_idx ON low_stock_alerts (product_id);

-- Adjustment tracking
CREATE INDEX adjustment_product_idx ON stock_adjustments (product_id);

-- ===================================
-- SAMPLE VERIFICATION QUERIES
-- ===================================

-- Check table creation
-- DESCRIBE TABLES;

-- Verify inventory structure
-- SELECT COUNT(*) FROM inventory_movements;
-- SELECT COUNT(*) FROM inventory_status;
-- SELECT COUNT(*) FROM purchase_orders;
