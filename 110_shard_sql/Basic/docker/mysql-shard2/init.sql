CREATE DATABASE IF NOT EXISTS shard2;
USE shard2;

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
('Người dùng 2', 'user2@example.com', 'user-002'),
('Người dùng 4', 'user4@example.com', 'user-004'),
('Người dùng 6', 'user6@example.com', 'user-006');

INSERT INTO products (name, price, product_id) VALUES
('Sản phẩm 2', 200.00, 'product-002'),
('Sản phẩm 4', 400.00, 'product-004'),
('Sản phẩm 6', 600.00, 'product-006');
