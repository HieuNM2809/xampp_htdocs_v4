-- Initialization script for APM Demo Database
-- This script will be executed when PostgreSQL container starts

-- Create database if not exists (handled by environment variable)
-- CREATE DATABASE IF NOT EXISTS apm_demo;

-- Connect to apm_demo database
\c apm_demo;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    city VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipping', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (only if tables are empty)
DO $$
BEGIN
    -- Check if users table is empty
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        -- Insert sample users
        INSERT INTO users (name, email, age, city) VALUES
        ('Nguyễn Văn An', 'an.nguyen@example.com', 25, 'Hà Nội'),
        ('Trần Thị Bình', 'binh.tran@example.com', 30, 'Hồ Chí Minh'),
        ('Lê Văn Cường', 'cuong.le@example.com', 28, 'Đà Nẵng'),
        ('Phạm Thị Dung', 'dung.pham@example.com', 32, 'Cần Thơ'),
        ('Hoàng Văn Em', 'em.hoang@example.com', 27, 'Hải Phòng'),
        ('Vũ Thị Phương', 'phuong.vu@example.com', 29, 'Nha Trang'),
        ('Đặng Văn Giang', 'giang.dang@example.com', 31, 'Huế'),
        ('Bùi Thị Hoa', 'hoa.bui@example.com', 26, 'Vũng Tàu'),
        ('Ngô Văn Ích', 'ich.ngo@example.com', 33, 'Quy Nhon'),
        ('Lý Thị Kim', 'kim.ly@example.com', 24, 'Đà Lạt');

        -- Insert sample orders
        INSERT INTO orders (user_id, product_name, amount, status) VALUES
        (1, 'Laptop Dell Inspiron 15', 15000000, 'completed'),
        (1, 'Chuột không dây Logitech', 500000, 'pending'),
        (2, 'iPhone 15 Pro', 28000000, 'completed'),
        (2, 'AirPods Pro', 5500000, 'shipping'),
        (3, 'Samsung Monitor 27"', 8000000, 'completed'),
        (3, 'Bàn phím cơ Keychron', 2500000, 'processing'),
        (4, 'Webcam Logitech HD', 1500000, 'completed'),
        (4, 'Tai nghe Sony', 3000000, 'pending'),
        (5, 'MacBook Pro M3', 45000000, 'shipping'),
        (5, 'Magic Mouse', 2200000, 'completed'),
        (6, 'iPad Air', 18000000, 'completed'),
        (6, 'Apple Pencil', 3000000, 'pending'),
        (7, 'Surface Pro', 22000000, 'processing'),
        (8, 'Gaming Chair', 6000000, 'completed'),
        (8, 'Standing Desk', 12000000, 'shipping'),
        (9, 'External SSD 1TB', 3500000, 'completed'),
        (9, 'USB-C Hub', 800000, 'pending'),
        (10, 'Wireless Earbuds', 2000000, 'completed');

        RAISE NOTICE 'Sample data inserted successfully!';
    ELSE
        RAISE NOTICE 'Sample data already exists, skipping insert.';
    END IF;
END $$;

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.city,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END), 0) as total_spent,
    COALESCE(AVG(CASE WHEN o.status = 'completed' THEN o.amount ELSE NULL END), 0) as avg_order_value,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email, u.city
ORDER BY total_spent DESC;

-- Create a view for order statistics
CREATE OR REPLACE VIEW order_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as order_date,
    COUNT(*) as total_orders,
    SUM(amount) as total_revenue,
    AVG(amount) as avg_order_value,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY order_date DESC;

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

RAISE NOTICE 'Database initialization completed successfully!';
RAISE NOTICE 'Tables created: users, orders';
RAISE NOTICE 'Views created: user_stats, order_stats';
RAISE NOTICE 'Sample data: % users, % orders', 
    (SELECT COUNT(*) FROM users), 
    (SELECT COUNT(*) FROM orders);
