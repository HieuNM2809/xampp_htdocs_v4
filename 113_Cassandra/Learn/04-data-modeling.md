# 🏗️ Chapter 4: Data Modeling - MySQL vs Cassandra

**Mục tiêu:** Master sự khác biệt fundamental trong cách approach data modeling

## 🎯 Core Philosophy Shift

### 🔵 MySQL: Entity-Relationship Modeling
**"What entities exist and how do they relate?"**

### 🔴 Cassandra: Query-Driven Modeling
**"What queries do I need to support?"**

---

## 📊 1. Normalization vs Denormalization

### 🔵 MySQL: Normalize to Eliminate Redundancy

```sql
-- MySQL: Normalized schema (3NF)
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE categories (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT
);

CREATE TABLE posts (
    id INT PRIMARY KEY,
    user_id INT,
    category_id INT,
    title VARCHAR(200),
    content TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE post_likes (
    post_id INT,
    user_id INT,
    created_at TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Benefits:**
- ✅ No data duplication
- ✅ Single source of truth
- ✅ Easy to maintain consistency
- ✅ Storage efficient

**Drawbacks:**
- ❌ Complex JOINs for simple queries
- ❌ Performance degrades with scale
- ❌ Single point of failure

### 🔴 Cassandra: Denormalize for Query Performance

```sql
-- Cassandra: Denormalized tables for different queries

-- Query: "Get user's posts with details"
CREATE TABLE posts_by_user (
    user_id UUID,
    post_created_at TIMESTAMP,
    post_id UUID,
    -- Denormalized user data
    user_name TEXT,
    user_email TEXT,
    -- Denormalized category data
    category_name TEXT,
    -- Post data
    title TEXT,
    content TEXT,
    likes_count COUNTER,
    PRIMARY KEY (user_id, post_created_at, post_id)
) WITH CLUSTERING ORDER BY (post_created_at DESC);

-- Query: "Get posts in category"
CREATE TABLE posts_by_category (
    category_id UUID,
    post_created_at TIMESTAMP,
    post_id UUID,
    -- Denormalized user data
    user_id UUID,
    user_name TEXT,
    -- Denormalized category data
    category_name TEXT,
    -- Post data
    title TEXT,
    content TEXT,
    likes_count COUNTER,
    PRIMARY KEY (category_id, post_created_at, post_id)
) WITH CLUSTERING ORDER BY (post_created_at DESC);

-- Query: "Get post details with like info"
CREATE TABLE post_details (
    post_id UUID PRIMARY KEY,
    title TEXT,
    content TEXT,
    user_id UUID,
    user_name TEXT,         -- Denormalized
    user_email TEXT,        -- Denormalized
    category_id UUID,
    category_name TEXT,     -- Denormalized
    likes_count COUNTER,
    comments_count COUNTER,
    created_at TIMESTAMP
);

-- Query: "Get users who liked a post"
CREATE TABLE post_likes_by_post (
    post_id UUID,
    user_id UUID,
    user_name TEXT,         -- Denormalized
    user_avatar TEXT,       -- Denormalized
    liked_at TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);
```

**Benefits:**
- ✅ Fast queries (single table reads)
- ✅ Horizontal scaling
- ✅ High availability
- ✅ Predictable performance

**Drawbacks:**
- ❌ Data duplication
- ❌ Storage overhead
- ❌ Consistency challenges
- ❌ More complex writes

---

## 🔄 2. Modeling Process Comparison

### 🔵 MySQL Modeling Process

```
1. Identify Entities
   ↓
2. Define Relationships
   ↓
3. Normalize (1NF → 2NF → 3NF)
   ↓
4. Add Indexes for Performance
   ↓
5. Write Queries with JOINs
```

**Example Process:**
```sql
-- Step 1: Identify entities
Users, Posts, Categories, Likes

-- Step 2: Define relationships
User → Posts (1:N)
Category → Posts (1:N)
Post → Likes (1:N)

-- Step 3: Normalize
CREATE TABLE users (...);
CREATE TABLE posts (...);
-- etc.

-- Step 4: Add indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Step 5: Query với JOINs
SELECT p.title, u.name, c.name as category
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id;
```

### 🔴 Cassandra Modeling Process

```
1. Identify Queries
   ↓
2. Design Table per Query Pattern
   ↓
3. Choose Partition Key
   ↓
4. Choose Clustering Columns
   ↓
5. Denormalize Data
```

**Example Process:**
```sql
-- Step 1: Identify queries
Q1: Get user's posts chronologically
Q2: Get posts in category chronologically
Q3: Get post details with stats
Q4: Get users who liked a post

-- Step 2: Design table per query
CREATE TABLE posts_by_user (...);      -- For Q1
CREATE TABLE posts_by_category (...);  -- For Q2
CREATE TABLE post_details (...);       -- For Q3
CREATE TABLE post_likes_by_post (...); -- For Q4

-- Step 3-5: Already shown above
```

---

## 🔑 3. Choosing Partition Keys

### Critical Decision: Partition Key Selection

**Partition Key** determines:
- Which node stores the data
- Query performance
- Data distribution
- Hotspots

### ✅ Good Partition Key Examples

```sql
-- Good: High cardinality, even distribution
CREATE TABLE user_posts (
    user_id UUID,           -- Good partition key
    post_date DATE,
    post_id UUID,
    title TEXT,
    PRIMARY KEY (user_id, post_date, post_id)
);

-- Good: Time-based with additional dimension
CREATE TABLE sensor_data (
    sensor_id UUID,         -- Good partition key
    year INT,               -- Prevents partition from growing too large
    timestamp TIMESTAMP,
    temperature DECIMAL,
    PRIMARY KEY ((sensor_id, year), timestamp)
);
```

### ❌ Bad Partition Key Examples

```sql
-- Bad: Low cardinality (hot partitions)
CREATE TABLE posts_by_status (
    status TEXT,            -- Bad! Only few values: 'published', 'draft'
    post_id UUID,
    title TEXT,
    PRIMARY KEY (status, post_id)
);

-- Bad: Monotonically increasing (single hot partition)
CREATE TABLE posts_by_time (
    timestamp TIMESTAMP,    -- Bad! All new writes go to same partition
    post_id UUID,
    title TEXT,
    PRIMARY KEY (timestamp, post_id)
);
```

---

## 📋 4. Real-World Example: Blog Platform

### 🔵 MySQL Schema (Normalized)

```sql
CREATE DATABASE blog_mysql;
USE blog_mysql;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    slug VARCHAR(100) UNIQUE,
    description TEXT
);

-- Posts table
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    category_id INT,
    title VARCHAR(200),
    slug VARCHAR(200) UNIQUE,
    content TEXT,
    status ENUM('draft', 'published'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Comments table
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id INT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_comments_post_id ON comments(post_id);
```

**Typical queries:**
```sql
-- Get user's posts
SELECT p.title, p.created_at, c.name as category
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id
WHERE u.username = 'john_doe'
ORDER BY p.created_at DESC;

-- Get post with comments
SELECT p.title, p.content, u.username as author,
       COUNT(c.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.slug = 'my-blog-post'
GROUP BY p.id;
```

### 🔴 Cassandra Schema (Denormalized)

```sql
CREATE KEYSPACE blog_cassandra
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
};

USE blog_cassandra;

-- Query: Get posts by user (chronological)
CREATE TABLE posts_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    -- Denormalized user data
    username TEXT,
    user_email TEXT,
    -- Denormalized category data
    category_id UUID,
    category_name TEXT,
    category_slug TEXT,
    -- Post data
    title TEXT,
    slug TEXT,
    content TEXT,
    status TEXT,
    updated_at TIMESTAMP,
    comments_count COUNTER,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: Get posts by category (chronological)
CREATE TABLE posts_by_category (
    category_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    -- Denormalized user data
    user_id UUID,
    username TEXT,
    -- Denormalized category data
    category_name TEXT,
    category_slug TEXT,
    -- Post data
    title TEXT,
    slug TEXT,
    content TEXT,
    status TEXT,
    updated_at TIMESTAMP,
    comments_count COUNTER,
    PRIMARY KEY (category_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: Get post by slug
CREATE TABLE posts_by_slug (
    slug TEXT PRIMARY KEY,
    post_id UUID,
    title TEXT,
    content TEXT,
    -- Denormalized user data
    user_id UUID,
    username TEXT,
    user_email TEXT,
    -- Denormalized category data
    category_id UUID,
    category_name TEXT,
    category_slug TEXT,
    -- Metadata
    status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    comments_count COUNTER
);

-- Query: Get comments for post (chronological)
CREATE TABLE comments_by_post (
    post_id UUID,
    created_at TIMESTAMP,
    comment_id UUID,
    -- Denormalized user data
    user_id UUID,
    username TEXT,
    user_email TEXT,
    -- Comment data
    content TEXT,
    PRIMARY KEY (post_id, created_at, comment_id)
) WITH CLUSTERING ORDER BY (created_at ASC);

-- User management table
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    username TEXT,
    email TEXT,
    password_hash TEXT,
    created_at TIMESTAMP
);

-- Category management table
CREATE TABLE categories (
    category_id UUID PRIMARY KEY,
    name TEXT,
    slug TEXT,
    description TEXT,
    posts_count COUNTER
);
```

**Simple queries (no JOINs needed):**
```sql
-- Get user's posts
SELECT * FROM posts_by_user
WHERE user_id = ?
LIMIT 20;

-- Get post details
SELECT * FROM posts_by_slug
WHERE slug = ?;

-- Get post comments
SELECT * FROM comments_by_post
WHERE post_id = ?;
```

---

## ⚡ 5. Performance Comparison

### Query Performance

| Operation | MySQL (Normalized) | Cassandra (Denormalized) |
|-----------|-------------------|---------------------------|
| Get user posts | 50-200ms (JOIN) | 1-5ms (single partition) |
| Get post details | 10-50ms (JOINs) | 1-3ms (single row) |
| Get category posts | 100-500ms (JOIN) | 1-5ms (single partition) |
| Insert new post | 5-20ms | 20-50ms (multiple tables) |

### Storage Comparison

| Aspect | MySQL | Cassandra |
|--------|-------|-----------|
| Storage efficiency | ✅ High (normalized) | ❌ Lower (duplicated data) |
| Write amplification | ✅ Low (single table) | ❌ High (multiple tables) |
| Read performance | ❌ Slower (JOINs) | ✅ Faster (single read) |

---

## 🎯 6. Decision Matrix

### When to use MySQL approach:
- ✅ Complex reporting needs
- ✅ Ad-hoc queries frequent
- ✅ Storage costs critical
- ✅ Data consistency critical
- ✅ Small to medium scale

### When to use Cassandra approach:
- ✅ Known query patterns
- ✅ High read throughput needed
- ✅ Massive scale required
- ✅ High availability critical
- ✅ Geographic distribution

---

## 🧪 Practical Exercise

**Challenge:** Design both MySQL and Cassandra schemas cho một **Social Media Platform**

### Requirements:
1. Users can post messages
2. Users can follow other users
3. Users have a timeline/feed
4. Posts can be liked/commented
5. Need to show trending posts

### MySQL Design:
```sql
-- Design normalized schema với proper relationships
-- Include necessary indexes
-- Write sample queries với JOINs
```

### Cassandra Design:
```sql
-- Identify key queries first:
-- Q1: Get user's timeline
-- Q2: Get user's posts
-- Q3: Get post details với likes/comments
-- Q4: Get trending posts
-- Q5: Get user's followers/following

-- Design denormalized tables
-- Choose appropriate partition keys
-- Include denormalized data
```

**Next:** Try implementing both designs in [Exercise 4](exercises/exercise-04.js)!

---

## 🎓 Chapter Summary

### Key Learnings:

1. **🔄 Paradigm Shift:** Entity-first → Query-first modeling
2. **📊 Normalization vs Denormalization:** Storage efficiency vs Query performance
3. **🔑 Partition Key Selection:** Critical for performance và distribution
4. **⚡ Trade-offs:** Write complexity vs Read performance
5. **🎯 Context Matters:** Choose approach based on use case

### Next Steps:
- 📖 Read [Chapter 5: Schema Design](05-schema-design.md)
- 🧪 Complete [Exercise 4: Data Modeling](exercises/exercise-04.js)
- 🔍 Practice query-driven design thinking

**Remember:** Data modeling là art + science. Practice makes perfect! 🎨🔬
