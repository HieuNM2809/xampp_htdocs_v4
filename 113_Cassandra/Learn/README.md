# 🎓 Cassandra Learning Path cho MySQL Developers

Chào mừng bạn đến với **Cassandra Learning Journey**! Vì bạn đã biết MySQL, tôi sẽ giúp bạn học Cassandra thông qua **so sánh và đối chiếu** với những gì bạn đã biết.

## 📋 Learning Roadmap

### 📚 **Phase 1: Fundamentals (1-2 tuần)**
1. **[Basic Concepts](01-basic-concepts.md)** - So sánh concepts cơ bản
2. **[Data Distribution Explained](cassandra-data-distribution-explained.md)** - Chi tiết về token ranges & clustering
3. **[TTL (Time To Live) Explained](cassandra-ttl-explained.md)** - Automatic data expiration
4. **[Advanced TTL Examples](advanced-ttl-examples.md)** - Production-grade TTL patterns
5. **[Architecture Differences](02-architecture.md)** - RDBMS vs NoSQL architecture
6. **[Data Types Comparison](03-data-types.md)** - MySQL vs Cassandra data types

### 🚀 **Advanced Topics:**
- **[Advanced Cassandra Roadmap](advanced-cassandra-roadmap.md)** - Complete advanced learning path
- **[Advanced Data Modeling](advanced-data-modeling-patterns.md)** - Master-level patterns
- **[Consistency Levels Advanced](consistency-levels-advanced.md)** - Tunable consistency mastery
- **[Production Performance Tuning](production-performance-tuning.md)** - Sub-10ms optimization

### 🏗️ **Phase 2: Data Modeling (1-2 tuần)**
4. **[Data Modeling Philosophy](04-data-modeling.md)** - Normalization vs Denormalization
5. **[Schema Design](05-schema-design.md)** - Tables, Keys, Partitions
6. **[Relationships](06-relationships.md)** - Foreign Keys vs Denormalization

### 🔍 **Phase 3: Querying (1-2 tuần)**
7. **[Query Syntax](07-query-syntax.md)** - SQL vs CQL comparison
8. **[CRUD Operations](08-crud-operations.md)** - INSERT, SELECT, UPDATE, DELETE
9. **[Advanced Queries](09-advanced-queries.md)** - JOINs vs Application-level joins

### ⚡ **Phase 4: Performance & Scale (1-2 tuần)**
10. **[Indexing Strategies](10-indexing.md)** - B-tree vs LSM-tree
11. **[Performance Tuning](11-performance.md)** - Optimization techniques
12. **[Scaling Patterns](12-scaling.md)** - Vertical vs Horizontal scaling

### 🎯 **Phase 5: Production (1 tuần)**
13. **[Deployment](13-deployment.md)** - Single node vs Cluster
14. **[Monitoring](14-monitoring.md)** - Tools and metrics
15. **[Best Practices](15-best-practices.md)** - Production readiness

## 🚀 Quick Start

```bash
# 1. Bắt đầu với basic concepts
cat Learn/01-basic-concepts.md

# 2. Thực hành với exercises
cd Learn/exercises
node 01-basic-setup.js

# 3. So sánh queries
node query-comparison.js

# 4. Làm bài tập
node exercise-01.js
```

## 📊 Learning Strategy

### 🔄 **So sánh liên tục**
Mỗi concept sẽ được giải thích theo format:
- ✅ **MySQL way** (cách bạn đã biết)
- 🔄 **Cassandra way** (cách mới)
- 💡 **Why different?** (tại sao khác)
- 🎯 **When to use?** (khi nào dùng)

### 🧪 **Thực hành song song**
- Setup cả MySQL và Cassandra
- Same data, different approaches
- Performance comparison
- Real-world examples

### 📝 **Progress Tracking**
- [ ] Phase 1: Fundamentals
- [ ] Phase 2: Data Modeling
- [ ] Phase 3: Querying
- [ ] Phase 4: Performance
- [ ] Phase 5: Production

## 💡 Study Tips

### 🎯 **Mindset Shifts cần thiết:**

1. **From Normalization → Denormalization**
   - MySQL: Tách bảng, tránh duplicate
   - Cassandra: Nhân bản data, optimize cho read

2. **From JOINs → Application Logic**
   - MySQL: JOIN tables trong database
   - Cassandra: Combine data trong application

3. **From ACID → BASE**
   - MySQL: Strong consistency
   - Cassandra: Eventually consistent

4. **From Vertical → Horizontal Scaling**
   - MySQL: Powerful single server
   - Cassandra: Many commodity servers

## 🛠️ Prerequisites

### MySQL Knowledge (assumed you know):
- ✅ Tables, columns, rows
- ✅ Primary keys, foreign keys
- ✅ JOINs (INNER, LEFT, RIGHT)
- ✅ Indexes (B-tree)
- ✅ Transactions (ACID)
- ✅ Normalization (1NF, 2NF, 3NF)

### What we'll learn about Cassandra:
- 🆕 Keyspaces, column families
- 🆕 Partition keys, clustering columns
- 🆕 Denormalization patterns
- 🆕 LSM-tree indexes
- 🆕 Eventually consistent
- 🆕 Application-level joins

## 📈 Progress Tracking

Track your progress sau mỗi chapter:

```bash
# Check understanding
node Learn/exercises/quiz-01.js

# Practice with real data
node Learn/exercises/practice-01.js

# Compare performance
node Learn/exercises/benchmark-01.js
```

## 🤝 Learning Support

### 💬 **Community Resources:**
- DataStax Academy (free courses)
- Cassandra Documentation
- Stack Overflow #cassandra
- Reddit r/cassandra

### 📚 **Recommended Reading:**
- "Cassandra: The Definitive Guide"
- "Learning Apache Cassandra"
- DataStax documentation

## 🎯 Learning Objectives

Sau khi hoàn thành course này, bạn sẽ:

✅ **Hiểu rõ** sự khác biệt giữa RDBMS và NoSQL
✅ **Thiết kế** Cassandra schemas hiệu quả
✅ **Viết** CQL queries tự tin
✅ **Optimize** performance cho production
✅ **Deploy** và maintain Cassandra clusters
✅ **Biết khi nào** dùng MySQL vs Cassandra

## 🚦 Start Here

**Bước đầu tiên:** Đọc [Basic Concepts](01-basic-concepts.md)

**Remember:** Đây không phải là competition giữa MySQL và Cassandra. Chúng là **different tools for different problems**! 🛠️

---

**Happy Learning! 🚀 Let's make you a Cassandra expert!**
