-- Initialize database for monitoring application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    country VARCHAR(2) DEFAULT 'US',
    source VARCHAR(50) DEFAULT 'direct',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User activities table
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    cancelled_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);

-- Products table (for inventory tracking)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    warehouse_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System metrics table (for storing historical data)
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    labels JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application logs table
CREATE TABLE IF NOT EXISTS application_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    component VARCHAR(100),
    trace_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_source ON users(source);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity ON user_activities(activity);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_category ON order_items(category);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON products(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_labels ON system_metrics USING GIN (labels);

CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_component ON application_logs(component);
CREATE INDEX IF NOT EXISTS idx_application_logs_created_at ON application_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_application_logs_trace_id ON application_logs(trace_id);

-- Insert sample data
INSERT INTO users (email, name, country, source) VALUES
('john.doe@example.com', 'John Doe', 'US', 'google'),
('jane.smith@example.com', 'Jane Smith', 'UK', 'direct'),
('bob.johnson@example.com', 'Bob Johnson', 'CA', 'facebook'),
('alice.brown@example.com', 'Alice Brown', 'DE', 'referral'),
('charlie.wilson@example.com', 'Charlie Wilson', 'FR', 'twitter')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, price, stock_quantity, warehouse_id) VALUES
('iPhone 15', 'electronics', 999.99, 50, 1),
('MacBook Pro', 'electronics', 2399.99, 25, 1),
('Nike Air Max', 'clothing', 129.99, 100, 2),
('The Great Gatsby', 'books', 12.99, 200, 3),
('Coffee Maker', 'home', 89.99, 75, 2),
('Yoga Mat', 'sports', 24.99, 150, 2),
('Face Cream', 'beauty', 34.99, 80, 3)
ON CONFLICT DO NOTHING;

-- Create sample orders
DO $$
DECLARE
    user_record RECORD;
    product_record RECORD;
    order_id INTEGER;
BEGIN
    FOR user_record IN SELECT id FROM users LIMIT 5 LOOP
        -- Create 2-3 orders per user
        FOR i IN 1..2 LOOP
            INSERT INTO orders (user_id, status, total_amount, payment_method)
            VALUES (
                user_record.id,
                CASE (RANDOM() * 4)::INTEGER
                    WHEN 0 THEN 'pending'
                    WHEN 1 THEN 'processing'
                    WHEN 2 THEN 'shipped'
                    WHEN 3 THEN 'delivered'
                    ELSE 'cancelled'
                END,
                (RANDOM() * 500 + 50)::DECIMAL(10,2),
                CASE (RANDOM() * 4)::INTEGER
                    WHEN 0 THEN 'credit_card'
                    WHEN 1 THEN 'paypal'
                    WHEN 2 THEN 'bank_transfer'
                    ELSE 'crypto'
                END
            ) RETURNING id INTO order_id;
            
            -- Add random items to each order
            FOR product_record IN SELECT id, name, category, price FROM products ORDER BY RANDOM() LIMIT (RANDOM() * 3 + 1)::INTEGER LOOP
                INSERT INTO order_items (order_id, product_id, product_name, category, quantity, unit_price, total_price)
                VALUES (
                    order_id,
                    product_record.id,
                    product_record.name,
                    product_record.category,
                    (RANDOM() * 3 + 1)::INTEGER,
                    product_record.price,
                    product_record.price * (RANDOM() * 3 + 1)::INTEGER
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Create functions for monitoring
CREATE OR REPLACE FUNCTION get_user_count() RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM users WHERE status = 'active');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_order_count() RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM orders);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_total_revenue() RETURNS DECIMAL AS $$
BEGIN
    RETURN (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('delivered', 'shipped'));
END;
$$ LANGUAGE plpgsql;

-- Create views for analytics
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users,
    COUNT(*) FILTER (WHERE source = 'google') as google_users,
    COUNT(*) FILTER (WHERE source = 'facebook') as facebook_users,
    COUNT(*) FILTER (WHERE source = 'direct') as direct_users
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW order_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
