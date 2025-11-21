# 📋 Quick Reference: MySQL → Cassandra

**Cheat sheet for MySQL developers learning Cassandra**

## 🔄 Syntax Translation

### DDL (Data Definition)

| MySQL | Cassandra CQL |
|-------|---------------|
| `CREATE DATABASE db;` | `CREATE KEYSPACE ks WITH REPLICATION = {...};` |
| `USE database;` | `USE keyspace;` |
| `DROP DATABASE db;` | `DROP KEYSPACE ks;` |
| `SHOW DATABASES;` | `DESCRIBE KEYSPACES;` |
| `SHOW TABLES;` | `DESCRIBE TABLES;` |

### Table Creation

| MySQL | Cassandra |
|-------|-----------|
| `id INT AUTO_INCREMENT PRIMARY KEY` | `id UUID PRIMARY KEY` |
| `name VARCHAR(100)` | `name TEXT` |
| `created_at TIMESTAMP DEFAULT NOW()` | `created_at TIMESTAMP` |
| `status ENUM('a','b')` | `status TEXT` |
| `INDEX idx_name (name)` | `CREATE INDEX idx_name ON table(name);` |

### DML (Data Manipulation)

| Operation | MySQL | Cassandra |
|-----------|-------|-----------|
| **Insert** | `INSERT INTO users (name) VALUES ('John');` | `INSERT INTO users (id, name) VALUES (uuid(), 'John');` |
| **Select** | `SELECT * FROM users WHERE name = 'John';` | `SELECT * FROM users WHERE id = ?;` |
| **Update** | `UPDATE users SET name = 'Jane' WHERE id = 1;` | `UPDATE users SET name = 'Jane' WHERE id = ?;` |
| **Delete** | `DELETE FROM users WHERE id = 1;` | `DELETE FROM users WHERE id = ?;` |

## 🚫 What You CAN'T Do in Cassandra

| MySQL Feature | Cassandra Alternative |
|---------------|----------------------|
| `JOIN` tables | Application-level joins or denormalization |
| `GROUP BY` aggregation | Counter columns or application logic |
| `ORDER BY` arbitrary columns | Use clustering columns |
| `LIKE '%pattern%'` | Full-text search engine (Solr/Elasticsearch) |
| Subqueries | Multiple queries or denormalization |
| `AUTO_INCREMENT` | Use `UUID` or application logic |
| `DEFAULT` values | Handle in application |
| `UNIQUE` constraints | Only for PRIMARY KEY |
| Transactions across tables | Batch operations (limited) |
| Manual data cleanup | Use `USING TTL seconds` for auto-expiration |

## 🔑 Primary Key Concepts

### MySQL Primary Key
```sql
-- Simple
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

-- Composite
CREATE TABLE enrollment (
    student_id INT,
    course_id INT,
    PRIMARY KEY (student_id, course_id)
);
```

### Cassandra Primary Key
```sql
-- Simple
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT
);

-- Compound: (partition_key, clustering_column)
CREATE TABLE enrollment (
    student_id UUID,      -- Partition key
    course_id UUID,       -- Clustering column
    grade TEXT,
    PRIMARY KEY (student_id, course_id)
);
```

**Key Difference:** Cassandra PRIMARY KEY = **Partition Key + Clustering Columns**

## 📊 Data Modeling Mindset Shift

### MySQL Approach: Entity-First
```
1. What entities exist? → Users, Posts, Categories
2. How do they relate? → 1:N, M:N relationships
3. Normalize → Separate tables, foreign keys
4. Query → Use JOINs to combine data
```

### Cassandra Approach: Query-First
```
1. What queries do I need? → "Get user posts", "Get category posts"
2. Design table per query → posts_by_user, posts_by_category
3. Denormalize → Duplicate data across tables
4. Query → Simple single-table lookups
```

## 🎯 Query Patterns

### MySQL: Flexible Querying
```sql
-- Can query any combination
SELECT u.name, p.title, c.name
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN categories c ON p.category_id = c.id
WHERE u.created_at > '2023-01-01'
  AND p.status = 'published'
  AND c.name LIKE 'Tech%'
ORDER BY p.view_count DESC
LIMIT 10;
```

### Cassandra: Partition-Key Driven
```sql
-- MUST include partition key
SELECT * FROM posts_by_user
WHERE user_id = ?                    -- Required: partition key
  AND created_at >= '2023-01-01'     -- Optional: clustering column
LIMIT 10;

-- This would require ALLOW FILTERING (slow!)
SELECT * FROM posts_by_user
WHERE created_at >= '2023-01-01';    -- ❌ Missing partition key
```

## ⚡ Performance Patterns

### MySQL Optimization
- Add indexes for WHERE/ORDER BY columns
- Optimize JOINs with proper keys
- Use EXPLAIN to analyze query plans
- Consider read replicas for scaling

### Cassandra Optimization
- Design tables for specific queries
- Choose partition key for even distribution
- Use clustering columns for sorting/filtering
- Denormalize to avoid application JOINs

## 🔧 Common Use Cases Translation

### User Registration System

**MySQL:**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_token VARCHAR(255),
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Cassandra:**
```sql
-- Table 1: Login by username
CREATE TABLE users_by_username (
    username TEXT PRIMARY KEY,
    user_id UUID,
    email TEXT,
    password_hash TEXT,
    created_at TIMESTAMP
);

-- Table 2: User details by ID
CREATE TABLE users_by_id (
    user_id UUID PRIMARY KEY,
    username TEXT,
    email TEXT,
    created_at TIMESTAMP
);

-- Table 3: Sessions with TTL
CREATE TABLE user_sessions (
    session_token TEXT PRIMARY KEY,
    user_id UUID,
    username TEXT,        -- Denormalized
    created_at TIMESTAMP
) WITH default_time_to_live = 86400;  -- 24 hour TTL
```

### Blog Platform

**MySQL:**
```sql
-- Normalized schema
CREATE TABLE users (...);
CREATE TABLE categories (...);
CREATE TABLE posts (
    id INT PRIMARY KEY,
    user_id INT,
    category_id INT,
    title VARCHAR(200),
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Query with JOINs
SELECT p.title, u.username, c.name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id;
```

**Cassandra:**
```sql
-- Query-specific tables
CREATE TABLE posts_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    title TEXT,
    content TEXT,
    username TEXT,        -- Denormalized
    category_name TEXT,   -- Denormalized
    PRIMARY KEY (user_id, created_at, post_id)
);

CREATE TABLE posts_by_category (
    category_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    title TEXT,
    content TEXT,
    username TEXT,        -- Denormalized
    PRIMARY KEY (category_id, created_at, post_id)
);

-- Simple queries
SELECT * FROM posts_by_user WHERE user_id = ?;
SELECT * FROM posts_by_category WHERE category_id = ?;
```

## 🎓 Learning Checklist

### Phase 1: Concepts ✅
- [ ] Understand keyspace vs database
- [ ] Master partition key concept
- [ ] Learn clustering columns
- [ ] Understand denormalization benefits

### Phase 2: Data Modeling ✅
- [ ] Query-first design thinking
- [ ] Identify access patterns
- [ ] Design partition keys properly
- [ ] Practice denormalization

### Phase 3: Querying ✅
- [ ] Master CQL syntax differences
- [ ] Understand query limitations
- [ ] Learn collection operations
- [ ] Practice counter columns

### Phase 4: Advanced ✅
- [ ] Batch operations
- [ ] Consistency levels
- [ ] Performance optimization
- [ ] Production deployment

## 🚀 Next Steps

1. **📖 Start Reading:** [Learn/01-basic-concepts.md](01-basic-concepts.md)
2. **🌐 Deep Dive:** [cassandra-data-distribution-explained.md](cassandra-data-distribution-explained.md) - Chi tiết về distributed architecture
3. **⏰ TTL Advanced:** [advanced-ttl-examples.md](advanced-ttl-examples.md) - Production TTL patterns
4. **🧪 Practice:** [exercises/exercise-01.js](exercises/exercise-01.js)
5. **🔬 Compare:** [exercises/mysql-vs-cassandra-comparison.js](exercises/mysql-vs-cassandra-comparison.js)
6. **🏗️ Build:** Create same application in both databases

## 💡 Pro Tips

- **Start Simple:** Begin with single-table queries
- **Think Different:** Abandon JOIN mentality, embrace denormalization
- **Query-First:** Always design tables for your access patterns
- **Partition Smart:** Choose high-cardinality partition keys
- **Measure Impact:** Compare performance of both approaches
- **Use Both:** MySQL for OLTP, Cassandra for OLAP can coexist!

---

**Remember:** This is not MySQL vs Cassandra competition. They're different tools for different problems! 🛠️
