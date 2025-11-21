# 🔍 Chapter 7: Query Syntax - SQL vs CQL

**Mục tiêu:** Master CQL syntax thông qua comparison với SQL

## 📊 Language Overview

### 🔵 SQL (Structured Query Language)
- Mature (1970s)
- Rich feature set
- Complex JOINs, subqueries
- ACID transactions

### 🔴 CQL (Cassandra Query Language)
- Inspired by SQL (familiar syntax)
- Simplified feature set
- No JOINs, no subqueries
- Eventually consistent

---

## 🏗️ 1. Data Definition Language (DDL)

### Creating Databases/Keyspaces

#### 🔵 MySQL
```sql
-- Create database
CREATE DATABASE ecommerce;
USE ecommerce;

-- Drop database
DROP DATABASE ecommerce;
```

#### 🔴 Cassandra
```sql
-- Create keyspace (equivalent to database)
CREATE KEYSPACE ecommerce
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
};

USE ecommerce;

-- Drop keyspace
DROP KEYSPACE ecommerce;
```

**💡 Key Difference:** Cassandra requires **replication strategy**

### Creating Tables

#### 🔵 MySQL
```sql
-- MySQL table creation
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);
```

#### 🔴 Cassandra
```sql
-- CQL table creation
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    username TEXT,
    email TEXT,
    password_hash TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_active BOOLEAN
);

-- Separate index creation
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**💡 Key Differences:**
- No `AUTO_INCREMENT` in Cassandra (use UUID)
- No `DEFAULT` values (handle in application)
- No `UNIQUE` constraints (except PRIMARY KEY)
- Indexes created separately

### Complex Table Structures

#### 🔵 MySQL: Foreign Keys & Relationships
```sql
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),

    INDEX idx_user_id (user_id),
    INDEX idx_category_id (category_id),
    INDEX idx_status (status)
);
```

#### 🔴 Cassandra: Compound Keys & Collections
```sql
CREATE TABLE posts_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    title TEXT,
    content TEXT,
    tags SET<TEXT>,              -- Collection type
    status TEXT,
    updated_at TIMESTAMP,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**💡 Key Differences:**
- No `FOREIGN KEY` constraints
- **Compound PRIMARY KEY** (partition + clustering)
- **Collection types** (SET, LIST, MAP)
- **Clustering order** specification

---

## 📝 2. Data Manipulation Language (DML)

### INSERT Operations

#### 🔵 MySQL
```sql
-- Simple insert
INSERT INTO users (username, email, password_hash)
VALUES ('john_doe', 'john@example.com', 'hashed_password');

-- Multiple inserts
INSERT INTO users (username, email, password_hash) VALUES
    ('jane_doe', 'jane@example.com', 'hash1'),
    ('bob_smith', 'bob@example.com', 'hash2');

-- Insert from SELECT
INSERT INTO archived_posts
SELECT * FROM posts WHERE status = 'archived';
```

#### 🔴 Cassandra
```sql
-- Simple insert
INSERT INTO users (user_id, username, email, password_hash, created_at)
VALUES (uuid(), 'john_doe', 'john@example.com', 'hashed_password', toTimestamp(now()));

-- Insert with TTL (Time To Live)
INSERT INTO session_tokens (token, user_id, created_at)
VALUES ('abc123', uuid(), toTimestamp(now()))
USING TTL 3600;  -- Expires in 1 hour

-- Insert with collection
INSERT INTO posts_by_user (user_id, created_at, post_id, title, tags)
VALUES (uuid(), toTimestamp(now()), uuid(), 'My Post', {'tech', 'cassandra'});

-- Conditional insert (lightweight transaction)
INSERT INTO users (user_id, username, email)
VALUES (uuid(), 'john_doe', 'john@example.com')
IF NOT EXISTS;
```

**💡 Key Differences:**
- Must provide all PRIMARY KEY components
- `TTL` support for auto-expiring data
- Collection syntax `{'item1', 'item2'}`
- Conditional inserts với `IF NOT EXISTS`

### SELECT Operations

#### 🔵 MySQL
```sql
-- Basic SELECT với JOINs
SELECT u.username, p.title, c.name as category_name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id
WHERE u.username = 'john_doe'
ORDER BY p.created_at DESC
LIMIT 10;

-- Aggregations
SELECT c.name, COUNT(*) as post_count, AVG(p.views) as avg_views
FROM posts p
JOIN categories c ON p.category_id = c.id
WHERE p.status = 'published'
GROUP BY c.id, c.name
HAVING COUNT(*) > 5
ORDER BY post_count DESC;

-- Subqueries
SELECT * FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM posts
    WHERE created_at >= '2023-01-01'
);
```

#### 🔴 Cassandra
```sql
-- Basic SELECT (single table only)
SELECT * FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
ORDER BY created_at DESC
LIMIT 10;

-- SELECT với collections
SELECT user_id, title, tags
FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
AND tags CONTAINS 'cassandra';

-- SELECT với filtering (avoid ALLOW FILTERING when possible)
SELECT * FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
AND created_at >= '2023-01-01'
AND status = 'published' ALLOW FILTERING;

-- Count (limited support)
SELECT COUNT(*) FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000;
```

**💡 Key Differences:**
- **NO JOINs** - single table queries only
- **NO subqueries**
- Limited `GROUP BY` / aggregation support
- Must include PARTITION KEY in WHERE clause
- `ALLOW FILTERING` needed cho non-indexed columns (avoid!)

### UPDATE Operations

#### 🔵 MySQL
```sql
-- Simple update
UPDATE users
SET email = 'new_email@example.com', updated_at = NOW()
WHERE username = 'john_doe';

-- Update with JOIN
UPDATE posts p
JOIN users u ON p.user_id = u.id
SET p.status = 'archived'
WHERE u.is_active = FALSE;

-- Conditional update
UPDATE users
SET login_count = login_count + 1
WHERE id = 123;
```

#### 🔴 Cassandra
```sql
-- Simple update (must include PRIMARY KEY)
UPDATE users
SET email = 'new_email@example.com', updated_at = toTimestamp(now())
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000;

-- Counter update
UPDATE post_stats
SET view_count = view_count + 1,
    like_count = like_count + 5
WHERE post_id = 550e8400-e29b-41d4-a716-446655440000;

-- Collection updates
UPDATE posts_by_user
SET tags = tags + {'new_tag'}  -- Add to set
WHERE user_id = ? AND created_at = ? AND post_id = ?;

UPDATE posts_by_user
SET tags = tags - {'old_tag'}  -- Remove from set
WHERE user_id = ? AND created_at = ? AND post_id = ?;

-- Conditional update (lightweight transaction)
UPDATE users
SET email = 'new@example.com'
WHERE user_id = ?
IF email = 'old@example.com';
```

**💡 Key Differences:**
- Must include **full PRIMARY KEY** in WHERE
- **Counter columns** special syntax
- **Collection operations** (+, -, append, prepend)
- **Lightweight transactions** với IF conditions

### DELETE Operations

#### 🔵 MySQL
```sql
-- Simple delete
DELETE FROM posts WHERE id = 123;

-- Delete with JOIN
DELETE p FROM posts p
JOIN users u ON p.user_id = u.id
WHERE u.is_active = FALSE;

-- Truncate table
TRUNCATE TABLE temp_data;
```

#### 🔴 Cassandra
```sql
-- Delete row (must include PRIMARY KEY)
DELETE FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
AND created_at = '2023-01-15 10:30:00'
AND post_id = 660e8400-e29b-41d4-a716-446655440001;

-- Delete columns
DELETE email, phone FROM users
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000;

-- Delete from collection
UPDATE posts_by_user
SET tags = tags - {'removed_tag'}
WHERE user_id = ? AND created_at = ? AND post_id = ?;

-- Conditional delete
DELETE FROM users
WHERE user_id = ?
IF email = 'specific@example.com';

-- Truncate table
TRUNCATE posts_by_user;
```

---

## 📊 3. Aggregation & Analytics

### 🔵 MySQL: Rich Aggregation Support
```sql
-- Group by với multiple aggregations
SELECT
    YEAR(created_at) as year,
    MONTH(created_at) as month,
    status,
    COUNT(*) as post_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(view_count) as avg_views,
    MAX(view_count) as max_views,
    MIN(created_at) as first_post
FROM posts
WHERE created_at >= '2023-01-01'
GROUP BY YEAR(created_at), MONTH(created_at), status
HAVING COUNT(*) > 10
ORDER BY year DESC, month DESC, post_count DESC;

-- Window functions
SELECT
    username,
    post_count,
    ROW_NUMBER() OVER (ORDER BY post_count DESC) as rank,
    LAG(post_count) OVER (ORDER BY post_count DESC) as prev_count
FROM (
    SELECT u.username, COUNT(p.id) as post_count
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    GROUP BY u.id, u.username
) user_stats;
```

### 🔴 Cassandra: Limited Aggregation
```sql
-- Simple count (single partition only)
SELECT COUNT(*) FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000;

-- Counter columns for pre-computed aggregations
CREATE TABLE post_stats (
    post_id UUID PRIMARY KEY,
    view_count COUNTER,
    like_count COUNTER,
    comment_count COUNTER
);

-- Update counters in real-time
UPDATE post_stats
SET view_count = view_count + 1
WHERE post_id = ?;

-- Use application-level aggregation for complex analytics
```

**💡 Strategy:** Pre-compute aggregations in Cassandra!

---

## 🔧 4. Advanced Features

### Transactions & Batching

#### 🔵 MySQL: Full ACID Transactions
```sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
INSERT INTO transactions (from_account, to_account, amount) VALUES (1, 2, 100);

COMMIT; -- hoặc ROLLBACK;
```

#### 🔴 Cassandra: Lightweight Transactions & Batches
```sql
-- Batch operations (atomic within single partition)
BEGIN BATCH
    INSERT INTO posts_by_user (...) VALUES (...);
    INSERT INTO posts_by_category (...) VALUES (...);
    UPDATE user_stats SET post_count = post_count + 1 WHERE user_id = ?;
APPLY BATCH;

-- Lightweight transactions (performance impact!)
INSERT INTO usernames (username, user_id)
VALUES ('john_doe', ?)
IF NOT EXISTS;

UPDATE users
SET email = 'new@example.com'
WHERE user_id = ?
IF email = 'old@example.com';
```

### Time-based Features

#### 🔵 MySQL: Date/Time Functions
```sql
SELECT
    DATE(created_at) as date,
    HOUR(created_at) as hour,
    COUNT(*) as posts_count
FROM posts
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at), HOUR(created_at);
```

#### 🔴 Cassandra: TTL & Time Functions
```sql
-- Insert with TTL (auto-expire)
INSERT INTO session_data (session_id, user_id, data, created_at)
VALUES (?, ?, ?, toTimestamp(now()))
USING TTL 86400; -- 24 hours

-- Time-based queries
SELECT * FROM posts_by_user
WHERE user_id = ?
AND created_at >= '2023-01-01'
AND created_at < '2023-02-01';

-- Using time functions
SELECT toDate(created_at), title FROM posts_by_user
WHERE user_id = ?;
```

---

## ⚠️ 5. Common Pitfalls & Limitations

### ❌ Things You CAN'T Do in CQL

```sql
-- ❌ JOINs
SELECT * FROM posts p JOIN users u ON p.user_id = u.id;

-- ❌ Subqueries
SELECT * FROM users WHERE id IN (SELECT user_id FROM posts);

-- ❌ Complex GROUP BY
SELECT status, COUNT(*) FROM posts GROUP BY status;

-- ❌ Most WHERE conditions without ALLOW FILTERING
SELECT * FROM posts WHERE title LIKE '%cassandra%';

-- ❌ ORDER BY arbitrary columns
SELECT * FROM posts ORDER BY view_count DESC;

-- ❌ Multi-table transactions
BEGIN TRANSACTION;
UPDATE posts SET status = 'published' WHERE id = 1;
UPDATE users SET post_count = post_count + 1 WHERE id = 123;
COMMIT;
```

### ✅ CQL Best Practices

```sql
-- ✅ Query by partition key
SELECT * FROM posts_by_user WHERE user_id = ?;

-- ✅ Use clustering columns for ordering
CREATE TABLE posts_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- ✅ Use counters for real-time stats
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY,
    post_count COUNTER,
    follower_count COUNTER
);

-- ✅ Use collections appropriately
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY,
    favorite_tags SET<TEXT>,
    recent_searches LIST<TEXT>,
    settings MAP<TEXT, TEXT>
);
```

---

## 🧪 Practical Exercise

### Challenge: Convert MySQL queries to CQL

**Given này MySQL schema:**
```sql
CREATE TABLE users (id INT PRIMARY KEY, username VARCHAR(50), email VARCHAR(100));
CREATE TABLE posts (id INT PRIMARY KEY, user_id INT, title VARCHAR(200), content TEXT, created_at TIMESTAMP);
CREATE TABLE comments (id INT PRIMARY KEY, post_id INT, user_id INT, content TEXT, created_at TIMESTAMP);
```

**MySQL Queries to Convert:**
```sql
-- Query 1: Get user's posts với comments count
SELECT p.title, p.created_at, COUNT(c.id) as comment_count
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.user_id = 123
GROUP BY p.id
ORDER BY p.created_at DESC;

-- Query 2: Get post with author và comments
SELECT p.title, u.username, c.content as comment_content, c.created_at as comment_time
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.id = 456;
```

**Your Task:** Design Cassandra tables và write CQL queries to achieve same results!

---

## 🎓 Chapter Summary

### Key Takeaways:

1. **🔤 Syntax Similarity:** CQL looks like SQL but behaves differently
2. **🚫 Missing Features:** No JOINs, subqueries, complex aggregations
3. **🔑 Primary Key Focus:** All queries must include partition key
4. **📊 Pre-compute Strategy:** Use counters và denormalization cho analytics
5. **⚡ Performance Trade-offs:** Simple queries, complex data modeling

### Migration Strategy:
1. **Identify query patterns** trong MySQL
2. **Design Cassandra tables** cho each pattern
3. **Denormalize data** để avoid JOINs
4. **Use application logic** cho complex operations
5. **Pre-compute aggregations** với counters

### Next Steps:
- 📖 Read [Chapter 8: CRUD Operations](08-crud-operations.md)
- 🧪 Complete [Exercise 7: Query Conversion](exercises/exercise-07.js)
- 🔍 Practice designing query-specific tables

**Remember:** CQL is not SQL! Embrace the differences! 🚀
