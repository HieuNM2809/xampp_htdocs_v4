# 📚 Chapter 1: Basic Concepts - MySQL vs Cassandra

**Mục tiêu:** Hiểu sự khác biệt cơ bản giữa MySQL (RDBMS) và Cassandra (NoSQL)

## 🆚 Core Philosophy Comparison

### MySQL Mindset vs Cassandra Mindset

| Aspect | 🔵 MySQL (RDBMS) | 🔴 Cassandra (NoSQL) |
|--------|------------------|----------------------|
| **Philosophy** | Normalize, avoid duplication | Denormalize, optimize for reads |
| **Relationships** | Foreign keys, JOINs | Application-level joins |
| **Consistency** | ACID, strong consistency | BASE, eventual consistency |
| **Scaling** | Vertical (bigger server) | Horizontal (more servers) |
| **Query Language** | SQL | CQL (Cassandra Query Language) |

---

## 🏗️ 1. Database Structure

### 🔵 MySQL Structure
```
MySQL Instance
├── Database (schema)
│   ├── Table 1
│   ├── Table 2
│   └── Table N
└── System databases
```

**Example:**
```sql
-- MySQL
CREATE DATABASE ecommerce;
USE ecommerce;

CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);
```

### 🔴 Cassandra Structure
```
Cassandra Cluster
├── Keyspace 1 (like database)
│   ├── Table 1 (Column Family)
│   ├── Table 2
│   └── Table N
└── System keyspaces
```

**Example:**
```sql
-- Cassandra CQL
CREATE KEYSPACE ecommerce
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
};

USE ecommerce;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT
);
```

**💡 Key Differences:**
- MySQL: Database → Tables
- Cassandra: Keyspace → Tables (Column Families)
- Cassandra requires **replication strategy** specification

---

## 🔑 2. Primary Keys

### 🔵 MySQL Primary Key
```sql
-- MySQL: Simple primary key
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

-- MySQL: Composite primary key
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);
```

### 🔴 Cassandra Primary Key
```sql
-- Cassandra: Simple primary key
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT
);

-- Cassandra: Compound primary key
CREATE TABLE order_items (
    order_id UUID,
    product_id UUID,
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);
-- order_id = Partition Key
-- product_id = Clustering Column
```

**💡 Key Differences:**
- MySQL: Primary key uniquely identifies row
- Cassandra: Primary key = **Partition Key + Clustering Columns**
  - **Partition Key** determines which node stores data
  - **Clustering Columns** determine sort order within partition

---

## 🗂️ 3. Data Distribution

### 🔵 MySQL Data Storage
```
Single MySQL Server
┌─────────────────────┐
│ All data on 1 server│
│ ┌─────────────────┐ │
│ │ users table     │ │
│ │ orders table    │ │
│ │ products table  │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 🔴 Cassandra Data Distribution
```
Cassandra Cluster (3 nodes)
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Node 1  │    │ Node 2  │    │ Node 3  │
│ Tokens: │    │ Tokens: │    │ Tokens: │
│ 0-33%   │    │ 34-66%  │    │ 67-100% │
│         │    │         │    │         │
│ Users:  │    │ Users:  │    │ Users:  │
│ A-F     │    │ G-M     │    │ N-Z     │
└─────────┘    └─────────┘    └─────────┘
```

**💡 Key Differences:**
- MySQL: Centralized storage
- Cassandra: **Distributed** across multiple nodes based on **hash of partition key**

---

## 🔍 4. Query Approach

### 🔵 MySQL Query Thinking
```sql
-- MySQL: Start with entities, JOIN as needed
SELECT u.name, o.total, p.name as product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE u.id = 123;
```

**MySQL Approach:**
1. Normalize data (avoid duplication)
2. Use JOINs to get related data
3. Database handles complexity

### 🔴 Cassandra Query Thinking
```sql
-- Cassandra: Design table for specific query
CREATE TABLE user_order_history (
    user_id UUID,
    order_date TIMESTAMP,
    order_id UUID,
    user_name TEXT,        -- Denormalized
    total DECIMAL,
    product_names LIST<TEXT>, -- Denormalized
    PRIMARY KEY (user_id, order_date, order_id)
) WITH CLUSTERING ORDER BY (order_date DESC);

-- Simple query, no JOINs
SELECT * FROM user_order_history WHERE user_id = ?;
```

**Cassandra Approach:**
1. **Query-first design** (design table for queries you need)
2. Denormalize data (duplicate to avoid JOINs)
3. Application handles complexity

**💡 Key Mindset Shift:**
- MySQL: "What entities do I have?" → Normalize → JOIN
- Cassandra: "What queries do I need?" → Design table → Denormalize

---

## 🎯 5. ACID vs BASE

### 🔵 MySQL: ACID Properties
```sql
-- MySQL Transaction
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Either both succeed or both fail
COMMIT; -- or ROLLBACK;
```

**ACID:**
- **Atomicity:** All or nothing
- **Consistency:** Valid state always
- **Isolation:** Concurrent transactions don't interfere
- **Durability:** Committed data persists

### 🔴 Cassandra: BASE Properties
```sql
-- Cassandra: No multi-table transactions
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- This might succeed...

UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- While this might fail or be delayed
```

**BASE:**
- **Basically Available:** System remains available
- **Soft state:** State may change over time
- **Eventually consistent:** Will be consistent eventually

**💡 Trade-off:**
- MySQL: Strong consistency, limited scale
- Cassandra: High availability, eventual consistency

---

## ⚖️ 6. When to Use What?

### 🔵 Use MySQL when:
- ✅ Complex relationships between entities
- ✅ Need ACID transactions
- ✅ Ad-hoc queries and reporting
- ✅ Small to medium scale (single server can handle)
- ✅ Team familiar with SQL

**Examples:** E-commerce, Banking, CRM, Traditional web apps

### 🔴 Use Cassandra when:
- ✅ Simple queries, high throughput
- ✅ Massive scale (terabytes+ of data)
- ✅ High availability requirements
- ✅ Geographic distribution
- ✅ Write-heavy workloads

**Examples:** IoT sensors, Social media feeds, Time-series data, Real-time analytics

---

## 🧪 Practical Exercise

**Setup both databases và compare:**

### MySQL Setup:
```sql
-- Create normalized schema
CREATE DATABASE learning;
USE learning;

CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);

CREATE TABLE posts (
    id INT PRIMARY KEY,
    user_id INT,
    title VARCHAR(200),
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Cassandra Setup:
```sql
-- Create denormalized schema
CREATE KEYSPACE learning
WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE user_posts (
    user_id UUID,
    post_id UUID,
    user_name TEXT,    -- Denormalized!
    user_email TEXT,   -- Denormalized!
    post_title TEXT,
    post_content TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**Exercise:** Insert same data vào cả hai, compare query performance!

---

## 🎓 Chapter Summary

### Key Takeaways:

1. **🔄 Paradigm Shift:** From normalization to denormalization
2. **🔑 Primary Keys:** MySQL = identifier, Cassandra = partition + clustering
3. **🌐 Distribution:** MySQL = single server, Cassandra = distributed cluster
4. **🔍 Querying:** MySQL = flexible JOINs, Cassandra = query-specific tables
5. **⚖️ Trade-offs:** MySQL = consistency, Cassandra = availability + scale

### Next Steps:
- ✅ Complete exercise above
- 📖 Read [Chapter 2: Architecture Differences](02-architecture.md)
- 🧪 Practice with [Exercise 1](exercises/exercise-01.js)

**Remember:** Different tools, different strengths. Master both mindsets! 🧠
