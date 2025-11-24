-- ===================================
-- USER MANAGEMENT TABLES
-- ===================================

USE ecommerce;

-- ===================================
-- 1. USER PROFILES (Main user data)
-- ===================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email TEXT,
    username TEXT,
    password_hash TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    date_of_birth DATE,

    -- Profile information
    profile_picture TEXT,   -- URL to profile image
    bio TEXT,
    preferred_language TEXT,
    preferred_currency TEXT,

    -- Account status
    account_status TEXT,    -- 'active', 'suspended', 'pending_verification'
    email_verified BOOLEAN,
    phone_verified BOOLEAN,

    -- Timestamps
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP,

    -- Privacy settings
    privacy_settings MAP<TEXT, BOOLEAN>,  -- {'email_marketing': true, 'sms_notifications': false}

    -- Statistics (counters for performance)
    total_orders COUNTER,
    total_spent COUNTER,   -- In cents to avoid decimal issues
    loyalty_points COUNTER
);

-- ===================================
-- 2. USER LOGIN (Email-based lookup)
-- ===================================

CREATE TABLE user_logins (
    email TEXT PRIMARY KEY,
    user_id UUID,
    password_hash TEXT,
    account_status TEXT,
    failed_login_attempts COUNTER,
    last_failed_login TIMESTAMP,
    created_at TIMESTAMP
);

-- ===================================
-- 3. USER SESSIONS (with TTL)
-- ===================================

CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID,

    -- Session data
    user_email TEXT,       -- Denormalized for quick access
    user_name TEXT,        -- Denormalized
    user_role TEXT,        -- 'customer', 'admin', 'vendor'

    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_info MAP<TEXT, TEXT>,

    -- Session state
    shopping_cart_id UUID,
    last_activity TIMESTAMP,

    -- Security
    session_data MAP<TEXT, TEXT>,  -- Encrypted session data

    created_at TIMESTAMP
) WITH default_time_to_live = 604800;  -- 7 days session expiry

-- ===================================
-- 4. USER ADDRESSES
-- ===================================

CREATE TABLE user_addresses (
    user_id UUID,
    address_id UUID,
    address_type TEXT,     -- 'billing', 'shipping', 'both'
    is_default BOOLEAN,

    -- Address fields
    recipient_name TEXT,
    street_line1 TEXT,
    street_line2 TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,

    -- Additional info
    delivery_instructions TEXT,
    address_label TEXT,    -- 'Home', 'Office', etc.

    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    PRIMARY KEY (user_id, address_id)
) WITH CLUSTERING ORDER BY (address_id ASC);

-- ===================================
-- 5. USER PREFERENCES
-- ===================================

CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY,

    -- Notification preferences
    email_notifications MAP<TEXT, BOOLEAN>,    -- {'order_updates': true, 'promotions': false}
    sms_notifications MAP<TEXT, BOOLEAN>,
    push_notifications MAP<TEXT, BOOLEAN>,

    -- Shopping preferences
    preferred_categories SET<TEXT>,
    favorite_brands SET<TEXT>,
    size_preferences MAP<TEXT, TEXT>,         -- {'clothing_size': 'M', 'shoe_size': '10'}

    -- Display preferences
    items_per_page INT,
    default_sort_order TEXT,                  -- 'price_low', 'price_high', 'newest', 'rating'
    currency_preference TEXT,
    language_preference TEXT,

    -- Privacy settings
    profile_visibility TEXT,                  -- 'public', 'friends', 'private'
    show_purchase_history BOOLEAN,
    allow_product_recommendations BOOLEAN,

    updated_at TIMESTAMP
);

-- ===================================
-- 6. USER ACTIVITY LOG (Time-series)
-- ===================================

CREATE TABLE user_activity_log (
    user_id UUID,
    activity_date DATE,         -- Partition by date for better distribution
    activity_timestamp TIMESTAMP,
    activity_id TIMEUUID,

    -- Activity details
    activity_type TEXT,         -- 'login', 'logout', 'view_product', 'add_to_cart', 'purchase'
    activity_description TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,

    -- Activity data
    activity_data MAP<TEXT, TEXT>,  -- Flexible data storage

    -- Related entities
    product_id UUID,            -- If activity relates to a product
    order_id UUID,             -- If activity relates to an order

    PRIMARY KEY ((user_id, activity_date), activity_timestamp, activity_id)
) WITH CLUSTERING ORDER BY (activity_timestamp DESC, activity_id DESC)
  AND default_time_to_live = 7776000;  -- 90 days retention

-- ===================================
-- 7. USER AUTHENTICATION ATTEMPTS
-- ===================================

CREATE TABLE auth_attempts (
    email TEXT,
    attempt_timestamp TIMESTAMP,
    attempt_id TIMEUUID,

    -- Attempt details
    success BOOLEAN,
    failure_reason TEXT,        -- 'invalid_password', 'account_locked', 'email_not_found'

    -- Security context
    ip_address INET,
    user_agent TEXT,
    country TEXT,              -- Geo-location based security
    suspicious_indicators LIST<TEXT>,  -- ['unusual_location', 'bot_like_behavior']

    -- Rate limiting
    attempts_in_window COUNTER,

    PRIMARY KEY (email, attempt_timestamp, attempt_id)
) WITH CLUSTERING ORDER BY (attempt_timestamp DESC, attempt_id DESC)
  AND default_time_to_live = 2592000;  -- 30 days retention

-- ===================================
-- 8. PASSWORD RESET TOKENS
-- ===================================

CREATE TABLE password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID,
    email TEXT,               -- Denormalized for quick lookup

    -- Token metadata
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    used_at TIMESTAMP,
    is_used BOOLEAN,

    -- Security
    ip_address INET,
    user_agent TEXT,

    -- Tracking
    email_sent_at TIMESTAMP,
    email_opened_at TIMESTAMP
) WITH default_time_to_live = 3600;  -- 1 hour expiry

-- ===================================
-- 9. USER SOCIAL CONNECTIONS (if needed)
-- ===================================

CREATE TABLE user_social_connections (
    user_id UUID,
    connection_type TEXT,      -- 'friend', 'follow', 'block'
    connected_user_id UUID,

    -- Connection metadata
    connection_strength DECIMAL, -- 0.0 to 1.0 based on interactions
    created_at TIMESTAMP,
    last_interaction TIMESTAMP,

    -- Mutual data
    mutual_connections_count INT,
    shared_interests SET<TEXT>,

    PRIMARY KEY (user_id, connection_type, connected_user_id)
) WITH CLUSTERING ORDER BY (connection_type ASC, connected_user_id ASC);

-- ===================================
-- INDEXES FOR EFFICIENT QUERIES
-- ===================================

-- Index for username lookups (if username login is supported)
CREATE INDEX user_username_idx ON users (username);

-- Index for account status queries (admin operations)
CREATE INDEX user_status_idx ON users (account_status);

-- Index for address country queries (shipping calculations)
CREATE INDEX address_country_idx ON user_addresses (country);

-- ===================================
-- INITIAL DATA VERIFICATION
-- ===================================

-- Verify table creation
DESCRIBE TABLES;

-- Sample queries to test (will be empty initially)
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM user_logins;
