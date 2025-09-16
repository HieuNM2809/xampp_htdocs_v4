CREATE DATABASE IF NOT EXISTS shard1;
USE shard1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id),
  UNIQUE KEY (email)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (product_id)
);

-- Insert some test data
INSERT INTO users (name, email, user_id) VALUES
('Người dùng 1', 'user1@example.com', 'user-001'),
('Người dùng 3', 'user3@example.com', 'user-003'),
('Người dùng 5', 'user5@example.com', 'user-005');

INSERT INTO products (name, price, product_id) VALUES
('Sản phẩm 1', 100.00, 'product-001'),
('Sản phẩm 3', 300.00, 'product-003'),
('Sản phẩm 5', 500.00, 'product-005');
