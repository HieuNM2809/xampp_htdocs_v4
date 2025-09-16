-- Initialization script for shard 1

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS sharddb1;
USE sharddb1;

-- Users table
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

-- Products table
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

-- Orders table
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

-- Order items table
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

-- Insert sample data
INSERT INTO users
  (id, email, username, firstName, lastName, country, city, createdAt, updatedAt)
VALUES
  ('7ef8f2a0-8786-4129-a195-a5c8c5efd9bc', 'john.doe@example.com', 'johndoe', 'John', 'Doe', 'USA', 'New York', NOW(), NOW()),
  ('a079d197-1325-4b6c-8f6d-91f91e5fca26', 'jane.smith@example.com', 'janesmith', 'Jane', 'Smith', 'UK', 'London', NOW(), NOW()),
  ('4f68451c-f0d5-4294-b900-01a7498d9df4', 'bob.johnson@example.com', 'bobjohnson', 'Bob', 'Johnson', 'Canada', 'Toronto', NOW(), NOW());

INSERT INTO products
  (id, name, description, price, category, stockQuantity, sku, createdAt, updatedAt)
VALUES
  ('94f2579a-e787-4bbb-b5e2-aac3c2b5d6e7', 'Smartphone X', 'Latest smartphone with amazing features', 999.99, 'Electronics', 100, 'ELEC001', NOW(), NOW()),
  ('d17c9eb2-7318-4b7c-98a3-8d9c1a4c38b5', 'Laptop Pro', 'Professional laptop for developers', 1499.99, 'Electronics', 50, 'ELEC002', NOW(), NOW()),
  ('3bce6570-4c83-4a5d-9d3e-5bd5a9c31f39', 'Desk Chair', 'Ergonomic office chair', 199.99, 'Furniture', 75, 'FURN001', NOW(), NOW());
