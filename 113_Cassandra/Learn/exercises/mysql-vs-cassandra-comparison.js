/**
 * Interactive Comparison: MySQL vs Cassandra
 * Side-by-side demonstration of key differences
 */

const database = require('../../config/database');

class MySQLvsCassandraComparison {

    async run() {
        console.log('🆚 MySQL vs Cassandra: Side-by-Side Comparison');
        console.log('📊 Interactive demonstration of key differences\n');

        try {
            await database.connect();

            await this.compareSchemaDesign();
            await this.compareDataTypes();
            await this.compareQueries();
            await this.comparePerformancePatterns();
            await this.compareScalingStrategies();

            console.log('\n🎯 Summary & Recommendations');
            this.showRecommendations();

        } catch (error) {
            console.error('❌ Comparison failed:', error);
        } finally {
            await database.disconnect();
        }
    }

    async compareSchemaDesign() {
        console.log('=== 🏗️  SCHEMA DESIGN COMPARISON ===\n');

        console.log('🔵 MySQL Approach: Entity-Relationship Design');
        console.log('   🎯 Philosophy: "What entities exist and how do they relate?"');

        const mysqlSchema = `
-- MySQL: Normalized schema
CREATE DATABASE blog;
USE blog;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    status ENUM('draft', 'published') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_user_posts (user_id, created_at),
    INDEX idx_category_posts (category_id, created_at)
);

-- Typical query with JOINs
SELECT u.username, p.title, c.name as category
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id
WHERE p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 20;
        `;

        console.log(mysqlSchema);

        console.log('🔴 Cassandra Approach: Query-Driven Design');
        console.log('   🎯 Philosophy: "What queries do I need to support?"');

        const client = database.getClient();

        try {
            const cassandraSchema = `
-- Cassandra: Query-specific tables
CREATE KEYSPACE blog
WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 3};

-- Query: "Get published posts chronologically"
CREATE TABLE published_posts (
    post_date DATE,
    created_at TIMESTAMP,
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
    PRIMARY KEY (post_date, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: "Get user's posts"
CREATE TABLE posts_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    title TEXT,
    content TEXT,
    status TEXT,
    -- Denormalized category data
    category_id UUID,
    category_name TEXT,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: "Get posts in category"
CREATE TABLE posts_by_category (
    category_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    title TEXT,
    content TEXT,
    -- Denormalized user data
    user_id UUID,
    username TEXT,
    PRIMARY KEY (category_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Simple queries, no JOINs needed
SELECT * FROM published_posts WHERE post_date = '2023-12-01' LIMIT 20;
SELECT * FROM posts_by_user WHERE user_id = ? LIMIT 20;
SELECT * FROM posts_by_category WHERE category_id = ? LIMIT 20;
            `;

            console.log(cassandraSchema);

            console.log('🔍 Key Differences:');
            console.log('   📊 MySQL: 3 normalized tables, complex JOINs');
            console.log('   📊 Cassandra: 3+ denormalized tables, simple queries');
            console.log('   🔄 MySQL: Single source of truth, referential integrity');
            console.log('   🔄 Cassandra: Data duplication, application-managed consistency');
            console.log('   ⚡ MySQL: Flexible queries, variable performance');
            console.log('   ⚡ Cassandra: Fixed queries, predictable performance');

        } catch (error) {
            console.log('❌ Schema demo error:', error.message);
        }
    }

    async compareDataTypes() {
        console.log('\n=== 📊 DATA TYPES & FEATURES COMPARISON ===\n');

        console.log('🔵 MySQL: Rich Type System');
        const mysqlTypes = `
-- MySQL data types
CREATE TABLE mysql_demo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive', 'pending'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    metadata JSON,
    UNIQUE KEY uk_name (name),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);
        `;

        console.log(mysqlTypes);

        console.log('🔴 Cassandra: Simplified Types + Collections');
        const cassandraTypes = `
-- Cassandra data types
CREATE TABLE cassandra_demo (
    id UUID PRIMARY KEY,
    name TEXT,                    -- No VARCHAR size limit
    description TEXT,
    price DECIMAL,
    is_active BOOLEAN,
    status TEXT,                  -- No ENUM, use TEXT
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    tags SET<TEXT>,               -- Collection: unique values
    recent_views LIST<TIMESTAMP>, -- Collection: ordered list
    metadata MAP<TEXT, TEXT>,     -- Collection: key-value pairs
    view_count COUNTER            -- Special: auto-incrementing
);

-- No AUTO_INCREMENT, no DEFAULT values, no UNIQUE constraints
-- No ON UPDATE triggers, no JSON type
        `;

        console.log(cassandraTypes);

        console.log('📋 Feature Comparison:');
        const featureComparison = `
┌─────────────────────┬─────────────┬─────────────────┐
│ Feature             │ MySQL       │ Cassandra       │
├─────────────────────┼─────────────┼─────────────────┤
│ AUTO_INCREMENT      │ ✅ Built-in  │ ❌ Use UUID     │
│ DEFAULT values      │ ✅ Yes       │ ❌ No           │
│ UNIQUE constraints  │ ✅ Yes       │ ❌ PK only      │
│ FOREIGN KEYS        │ ✅ Yes       │ ❌ No           │
│ ENUM types          │ ✅ Yes       │ ❌ Use TEXT     │
│ JSON type           │ ✅ Yes       │ ❌ Use MAP      │
│ Collections         │ ❌ No        │ ✅ SET/LIST/MAP │
│ COUNTER columns     │ ❌ No        │ ✅ Yes          │
│ TTL (auto-expire)   │ ❌ Manual    │ ✅ Built-in     │
└─────────────────────┴─────────────┴─────────────────┘
        `;

        console.log(featureComparison);
    }

    async compareQueries() {
        console.log('\n=== 🔍 QUERY CAPABILITIES COMPARISON ===\n');

        console.log('🔵 MySQL: Full SQL Power');
        const mysqlQueries = `
-- MySQL: Complex analytics query
SELECT
    u.username,
    c.name as category,
    COUNT(p.id) as post_count,
    AVG(p.view_count) as avg_views,
    MAX(p.created_at) as last_post,
    RANK() OVER (ORDER BY COUNT(p.id) DESC) as user_rank
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.username, c.id, c.name
HAVING COUNT(p.id) > 5
ORDER BY post_count DESC, avg_views DESC
LIMIT 10;

-- MySQL: Subquery example
SELECT username FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM posts
    WHERE view_count > (
        SELECT AVG(view_count) FROM posts
    )
);

-- MySQL: Complex WHERE conditions
SELECT * FROM posts
WHERE title LIKE '%cassandra%'
   OR content LIKE '%database%'
   AND view_count BETWEEN 100 AND 1000
   AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY);
        `;

        console.log(mysqlQueries);

        console.log('🔴 Cassandra: Simple but Fast');
        const cassandraQueries = `
-- Cassandra: Must include partition key
SELECT * FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
LIMIT 10;

-- Cassandra: Can use clustering columns for range
SELECT * FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
  AND created_at >= '2023-11-01'
  AND created_at < '2023-12-01';

-- Cassandra: Collection queries
SELECT * FROM posts_by_user
WHERE user_id = 550e8400-e29b-41d4-a716-446655440000
  AND tags CONTAINS 'cassandra';

-- Cassandra: Counter operations
UPDATE post_stats
SET view_count = view_count + 1,
    like_count = like_count + 1
WHERE post_id = 550e8400-e29b-41d4-a716-446655440000;

-- ❌ What you CAN'T do in Cassandra:
-- SELECT * FROM posts WHERE title LIKE '%search%';     -- No LIKE
-- SELECT COUNT(*) FROM posts GROUP BY category;        -- Limited GROUP BY
-- SELECT * FROM posts ORDER BY view_count DESC;        -- No arbitrary ORDER BY
-- SELECT * FROM posts WHERE view_count > 100;          -- Need ALLOW FILTERING
        `;

        console.log(cassandraQueries);

        console.log('🎯 Query Philosophy Differences:');
        console.log('   🔵 MySQL: "What data do you want?" → Write flexible query');
        console.log('   🔴 Cassandra: "How will you access data?" → Design table for query');
        console.log('   📊 MySQL: Ad-hoc analytics, complex reporting');
        console.log('   📊 Cassandra: Known access patterns, fast lookups');
    }

    async comparePerformancePatterns() {
        console.log('\n=== ⚡ PERFORMANCE PATTERNS COMPARISON ===\n');

        console.log('🔵 MySQL Performance Strategies:');
        console.log(`
🔧 Indexing:
   - B-tree indexes for fast lookups
   - Composite indexes for multi-column queries
   - Covering indexes to avoid table lookups

🔧 Query Optimization:
   - EXPLAIN to analyze query plans
   - Query cache for repeated queries
   - Optimize JOINs and subqueries

🔧 Scaling:
   - Read replicas for read scaling
   - Partitioning large tables
   - Connection pooling
   - Vertical scaling (bigger server)
        `);

        console.log('🔴 Cassandra Performance Strategies:');
        console.log(`
🔧 Data Modeling:
   - Denormalize for fast reads
   - Partition key design for even distribution
   - Clustering columns for sorted data

🔧 Query Patterns:
   - Always include partition key
   - Use clustering columns for filtering
   - Pre-compute aggregations with counters

🔧 Scaling:
   - Add more nodes horizontally
   - Replication for availability
   - Consistent hashing for distribution
   - No single points of failure
        `);

        // Performance comparison table
        console.log('📊 Performance Characteristics:');
        const perfComparison = `
┌─────────────────────┬─────────────────┬─────────────────┐
│ Operation           │ MySQL           │ Cassandra       │
├─────────────────────┼─────────────────┼─────────────────┤
│ Simple SELECT       │ 1-10ms          │ 0.1-1ms         │
│ Complex JOIN        │ 10-100ms+       │ ❌ Not supported │
│ INSERT              │ 1-5ms           │ 0.1-1ms         │
│ Batch INSERT        │ 10-50ms         │ 1-5ms           │
│ COUNT(*)            │ 100-1000ms+     │ ❌ Avoid/Limited │
│ Range queries       │ 10-100ms        │ 1-10ms          │
│ Full table scan     │ Minutes/Hours   │ ❌ Not supported │
│ Scaling reads       │ Add replicas    │ Add nodes       │
│ Scaling writes      │ ⚠️ Limited       │ Linear scaling  │
└─────────────────────┴─────────────────┴─────────────────┘
        `;

        console.log(perfComparison);
    }

    async compareScalingStrategies() {
        console.log('\n=== 📈 SCALING STRATEGIES COMPARISON ===\n');

        console.log('🔵 MySQL Scaling Journey:');
        console.log(`
📊 Stage 1: Single Server (0-10K users)
   ✅ Simple setup, ACID guarantees
   ⚠️  Single point of failure

📊 Stage 2: Master-Slave (10K-100K users)
   ✅ Read scaling with replicas
   ⚠️  Write bottleneck at master
   ⚠️  Replication lag issues

📊 Stage 3: Sharding (100K+ users)
   ✅ Distribute writes across shards
   ❌ Complex application logic
   ❌ Cross-shard JOINs problems
   ❌ Rebalancing difficulties

📊 Stage 4: Give up and move to NoSQL 😅
        `);

        console.log('🔴 Cassandra Scaling Journey:');
        console.log(`
📊 Stage 1: 3-Node Cluster (0-1M users)
   ✅ Built-in replication & HA
   ✅ Linear scaling ready

📊 Stage 2: Add More Nodes (1M+ users)
   ✅ Add nodes, automatic rebalancing
   ✅ No downtime scaling
   ✅ Consistent performance

📊 Stage 3: Multi-DC (Global scale)
   ✅ Geographic distribution
   ✅ Disaster recovery
   ✅ Local latency optimization

📊 Stage 4: Keep scaling linearly 🚀
        `;

        console.log('🏗️ Architecture Comparison:');
        const archComparison = `
MySQL Traditional:                 Cassandra Distributed:
┌─────────────────┐               ┌─────┐ ┌─────┐ ┌─────┐
│   MySQL Master │               │Node1│ │Node2│ │Node3│
│                 │               │  A-F│ │ G-M │ │ N-Z │
└─────────────────┘               └─────┘ └─────┘ └─────┘
         │                           │       │       │
    ┌─────────┬─────────┐            └───────┼───────┘
    │         │         │                    │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐           Auto-distribute
│Replica│ │Replica│ │Replica│           & replicate
│   1   │ │   2   │ │   3   │
└───────┘ └───────┘ └───────┘

• Single write master      vs    • All nodes accept writes
• Read replicas only       vs    • Peer-to-peer architecture
• Manual failover          vs    • Automatic fault tolerance
• Vertical scaling limits  vs    • Horizontal linear scaling
        `;

        console.log(archComparison);
    }

    showRecommendations() {
        console.log('\n=== 🎯 WHEN TO USE WHAT? ===\n');

        console.log('✅ Choose MySQL when:');
        console.log('   🔍 Complex reporting & analytics needs');
        console.log('   💰 Strong consistency requirements (banking, finance)');
        console.log('   🧠 Team expertise in SQL');
        console.log('   📊 Ad-hoc queries frequent');
        console.log('   📏 Small-medium scale (single server sufficient)');
        console.log('   🔗 Complex relationships between entities');

        console.log('\n✅ Choose Cassandra when:');
        console.log('   🚀 High throughput requirements (100K+ ops/sec)');
        console.log('   📱 Simple, predictable query patterns');
        console.log('   🌍 Multi-datacenter deployment needs');
        console.log('   ⚡ Low latency critical (< 10ms)');
        console.log('   📈 Massive scale (TB+ of data)');
        console.log('   🎯 High availability requirements (99.99%+)');

        console.log('\n🤔 Consider Hybrid Approach:');
        console.log('   💡 MySQL for transactional data + complex queries');
        console.log('   💡 Cassandra for time-series, logs, activity feeds');
        console.log('   💡 Use right tool for each specific use case');

        console.log('\n📚 Learning Path Recommendations:');
        console.log('   1. Master MySQL patterns first (you already did ✅)');
        console.log('   2. Learn Cassandra data modeling mindset');
        console.log('   3. Practice query-driven design');
        console.log('   4. Understand CAP theorem trade-offs');
        console.log('   5. Experiment with both on same dataset');

        console.log('\n🎓 Next Steps in Learning:');
        console.log('   📖 Read: Learn/04-data-modeling.md');
        console.log('   📖 Read: Learn/07-query-syntax.md');
        console.log('   🧪 Practice: exercises/exercise-02.js');
        console.log('   🔬 Experiment: Build same app in both!');
    }
}

// Run comparison if called directly
if (require.main === module) {
    const comparison = new MySQLvsCassandraComparison();

    console.log('🆚 Interactive MySQL vs Cassandra Comparison');
    console.log('📚 Perfect for MySQL developers learning Cassandra');
    console.log('⏱️  Estimated time: 20-30 minutes\n');

    comparison.run().then(() => {
        console.log('\n✨ Comparison completed!');
        console.log('🧠 You now understand the key philosophical differences');
        console.log('🔜 Ready to dive deeper into specific topics!');
    });
}

module.exports = MySQLvsCassandraComparison;
