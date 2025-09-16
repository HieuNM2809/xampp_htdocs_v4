-- Initialization script for shard 2

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS sharddb2;
USE sharddb2;

-- Users table - same schema as shard 1
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  country VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_country (country)
);

-- Products table - same schema as shard 1
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  stockQuantity INT NOT NULL DEFAULT 0,
  sku VARCHAR(20) NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_category (category),
  INDEX idx_sku (sku)
);

-- Orders table - same schema as shard 1
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  totalAmount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  paymentMethod VARCHAR(20) NOT NULL,
  shippingAddress JSON NOT NULL,
  trackingNumber VARCHAR(100),
  notes TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_created (createdAt)
);

-- Order items table - same schema as shard 1
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  orderId VARCHAR(36) NOT NULL,
  productId VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  INDEX idx_orderId (orderId),
  INDEX idx_productId (productId),
  CONSTRAINT fk_order_items_orders FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE
);

-- Insert sample data (different from shard 1)
INSERT INTO users
  (id, email, username, firstName, lastName, country, city, createdAt, updatedAt)
VALUES
  ('f33d3a73-6f65-48c7-8c9a-2d7b1f145678', 'alice.wong@example.com', 'alicewong', 'Alice', 'Wong', 'Singapore', 'Singapore', NOW(), NOW()),
  ('15c7f8c9-2e65-4e5f-a67b-8d9c4e5f6a7b', 'michael.brown@example.com', 'michaelbrown', 'Michael', 'Brown', 'Australia', 'Sydney', NOW(), NOW()),
  ('c7e4f5d6-3a2b-1c9d-8e7f-6a5b4c3d2e1f', 'emma.davis@example.com', 'emmadavis', 'Emma', 'Davis', 'Germany', 'Berlin', NOW(), NOW());

INSERT INTO products
  (id, name, description, price, category, stockQuantity, sku, createdAt, updatedAt)
VALUES
  ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Coffee Maker', 'Premium automatic coffee maker', 129.99, 'Kitchen', 60, 'KITC001', NOW(), NOW()),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Wireless Headphones', 'Noise-cancelling wireless headphones', 249.99, 'Electronics', 80, 'ELEC003', NOW(), NOW()),
  ('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'Running Shoes', 'Professional running shoes', 89.99, 'Sports', 120, 'SPRT001', NOW(), NOW());
