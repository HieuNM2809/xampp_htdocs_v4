# 🚀 Cassandra + Node.js Example

Một ví dụ hoàn chỉnh về cách sử dụng **Apache Cassandra** với **Node.js** và **Express.js** để xây dựng một RESTful API.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Sử dụng](#-sử-dụng)
- [API Endpoints](#-api-endpoints)
- [Advanced Patterns](#-advanced-patterns)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Ví dụ CRUD](#-ví-dụ-crud)

## 🌟 Tính năng

### Basic Features
- ✅ Kết nối và quản lý database Cassandra
- ✅ Models với CRUD operations hoàn chỉnh
- ✅ RESTful API với Express.js
- ✅ Validation và error handling
- ✅ UUID management
- ✅ Set operations (tags)
- ✅ Filtering và indexing
- ✅ Graceful shutdown
- ✅ Environment configuration

### Advanced Features
- 🚀 **Multi-table queries** với denormalization patterns
- 🚀 **Aggregation patterns** với counter columns
- 🚀 **Batch operations** để maintain consistency
- 🚀 **Complex relationships** (many-to-many, hierarchical)
- 🚀 **Time-series patterns** với partitioning
- 🚀 **Activity feeds** và social features
- 🚀 **Real-time analytics** với pre-computed aggregations
- 🚀 **Performance optimizations** với parallel queries

## 🔧 Yêu cầu hệ thống

- **Node.js** >= 16.x
- **Apache Cassandra** >= 3.11 hoặc **DataStax Astra DB**
- **npm** hoặc **yarn**

## 📦 Cài đặt

### 1. Cài đặt Cassandra

#### Option 1: Sử dụng Docker (Khuyến nghị)
```bash
# Chạy Cassandra container
docker run --name cassandra-container -p 9042:9042 -d cassandra:3.11

# Kiểm tra trạng thái
docker logs cassandra-container
```

#### Option 2: Cài đặt local
Tải về từ [Apache Cassandra](https://cassandra.apache.org/download/) và làm theo hướng dẫn cài đặt.

### 2. Clone và cài đặt dependencies

```bash
# Clone project
git clone <repository-url>
cd cassandra-nodejs-example

# Cài đặt dependencies
npm install
```

## ⚙️ Cấu hình

### 1. Tạo file .env

```bash
cp .env.example .env
```

### 2. Cấu hình database trong `.env`

```env
# Cassandra Database Configuration
CASSANDRA_HOSTS=127.0.0.1
CASSANDRA_KEYSPACE=nodejs_example
CASSANDRA_USERNAME=
CASSANDRA_PASSWORD=

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Khởi tạo database

```bash
# Tạo keyspace và tables
npm run init-db
```

## 🚀 Sử dụng

### Khởi động server

```bash
# Development mode (với nodemon)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

### Health Check

```bash
curl http://localhost:3000/health
```

## 🚀 Advanced Patterns

Dự án này demonstrate các **advanced patterns** quan trọng trong Cassandra:

- **[Denormalization](ADVANCED_PATTERNS.md#denormalization-patterns)** - Duplicate data across tables
- **[Multi-table queries](ADVANCED_PATTERNS.md#multi-table-queries)** - Application-level joins
- **[Aggregation patterns](ADVANCED_PATTERNS.md#aggregation-patterns)** - Counter columns, pre-computed stats
- **[Batch operations](ADVANCED_PATTERNS.md#batch-operations)** - Atomic multi-table updates
- **[Complex relationships](ADVANCED_PATTERNS.md#complex-relationships)** - Many-to-many, hierarchical data
- **[Performance optimization](ADVANCED_PATTERNS.md#performance-optimization)** - Parallel queries, partitioning

👉 **Xem chi tiết:** [ADVANCED_PATTERNS.md](ADVANCED_PATTERNS.md)

## ❌ Tại sao Cassandra không có JOIN?

**Cassandra KHÔNG hỗ trợ JOIN operations** như SQL databases. Đây là design decision có chủ ý:

- **Distributed architecture** - Data spread across multiple nodes
- **Performance optimization** - Single-table queries are faster
- **Horizontal scaling** focus - JOIN operations don't scale well
- **NoSQL philosophy** - Denormalization over normalization

### Thay thế JOIN bằng:

1. **Application-level joins** - Query multiple tables parallel
2. **Denormalization** - Store duplicate data for fast reads
3. **Counter columns** - Real-time aggregation
4. **Materialized views** - Pre-computed query results

👉 **Tìm hiểu chi tiết:** [WHY_NO_JOINS.md](WHY_NO_JOINS.md)

## 🎓 Learning Path cho MySQL Developers

**Đặc biệt dành cho bạn!** Vì bạn đã biết MySQL, chúng tôi đã tạo một **learning curriculum hoàn chỉnh** để bạn học Cassandra một cách nhanh chóng và hiệu quả thông qua **so sánh với MySQL**.

### 🚀 Quick Start Learning:

```bash
# Bắt đầu học ngay
npm run learn                # Bài tập cơ bản
npm run learn-compare       # So sánh MySQL vs Cassandra
```

### 📚 Learning Resources:

- **[Learning Roadmap](Learn/learning-roadmap.md)** - 6-8 tuần curriculum
- **[Quick Reference](Learn/quick-reference.md)** - MySQL → Cassandra cheat sheet
- **[Basic Concepts](Learn/01-basic-concepts.md)** - So sánh concepts cơ bản
- **[Data Modeling](Learn/04-data-modeling.md)** - Normalization vs Denormalization
- **[Query Syntax](Learn/07-query-syntax.md)** - SQL vs CQL comparison
- **[Interactive Exercises](Learn/exercises/)** - Hands-on practice

### 🎯 Learning Path Overview:

- **Week 1-2:** Fundamentals & mindset shift
- **Week 3-4:** Data modeling & schema design
- **Week 5-6:** Querying & operations
- **Week 7-8:** Advanced topics & production

👉 **Bắt đầu ngay:** [Learn/README.md](Learn/README.md)

## 📊 API Endpoints

### Users API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Lấy danh sách users |
| GET | `/api/users/:id` | Lấy user theo ID |
| GET | `/api/users/email/:email` | Tìm user theo email |
| POST | `/api/users` | Tạo user mới |
| PUT | `/api/users/:id` | Cập nhật user |
| DELETE | `/api/users/:id` | Xóa user |

### Posts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Lấy danh sách posts |
| GET | `/api/posts/:id` | Lấy post theo ID |
| GET | `/api/posts/user/:userId` | Lấy posts của user |
| GET | `/api/posts/tag/:tag` | Lấy posts theo tag |
| POST | `/api/posts` | Tạo post mới |
| PUT | `/api/posts/:id` | Cập nhật post |
| DELETE | `/api/posts/:id` | Xóa post |
| POST | `/api/posts/:id/tags` | Thêm tag vào post |
| DELETE | `/api/posts/:id/tags/:tag` | Xóa tag khỏi post |

### Advanced API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/advanced/users/:id/profile` | User profile với full details |
| POST | `/api/advanced/users/:id/follow` | Follow user (batch operations) |
| GET | `/api/advanced/categories/:id/details` | Category với posts và stats |
| GET | `/api/advanced/search` | Cross-table search |
| POST | `/api/advanced/posts` | Tạo post với denormalization |
| GET | `/api/advanced/posts/hot` | Hot posts với engagement |
| GET | `/api/advanced/tags/trending` | Trending tags |
| GET | `/api/advanced/analytics/overview` | Platform analytics |

## 📁 Cấu trúc dự án

```
cassandra-nodejs-example/
├── Learn/                       # 🎓 Learning curriculum cho MySQL devs
│   ├── README.md                # Learning overview
│   ├── learning-roadmap.md      # 6-8 week curriculum
│   ├── quick-reference.md       # MySQL → Cassandra cheat sheet
│   ├── 01-basic-concepts.md     # Concepts comparison
│   ├── 04-data-modeling.md      # Modeling approaches
│   ├── 07-query-syntax.md       # SQL vs CQL syntax
│   └── exercises/               # Interactive exercises
│       ├── exercise-01.js       # Basic concepts practice
│       └── mysql-vs-cassandra-comparison.js
├── config/
│   └── database.js              # Kết nối Cassandra
├── models/
│   ├── User.js                  # Basic User model
│   ├── Post.js                  # Basic Post model
│   ├── UserProfile.js           # Advanced user với relationships
│   ├── Category.js              # Category với multi-table queries
│   └── AdvancedPost.js          # Posts với denormalization
├── routes/
│   ├── users.js                 # Basic User API
│   ├── posts.js                 # Basic Post API
│   └── advanced.js              # Advanced patterns API
├── scripts/
│   ├── init-database.js         # Basic schemas
│   └── advanced-database.js     # Advanced schemas
├── examples/
│   ├── api-examples.js          # Basic API demo
│   ├── advanced-queries.js      # Advanced patterns demo
│   └── no-joins-comparison.js   # Why no JOINs explanation
├── .env                         # Environment variables
├── package.json
├── server.js                    # Main server file
├── README.md                    # Project overview
├── ADVANCED_PATTERNS.md         # Advanced patterns guide
├── MULTI_TABLE_EXAMPLES.md      # Multi-table query examples
├── WHY_NO_JOINS.md             # JOINs explanation
├── GETTING_STARTED.md           # Quick start guide
└── .gitignore
```

## 💡 Ví dụ CRUD

### 1. Tạo User

```bash
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "age": 25
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john@example.com",
    "name": "John Doe",
    "age": 25,
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:00:00.000Z"
  },
  "message": "Tạo user thành công"
}
```

### 2. Tạo Post

```bash
curl -X POST http://localhost:3000/api/posts \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Hello Cassandra",
    "content": "This is my first post using Cassandra!",
    "tags": ["cassandra", "nodejs", "database"]
  }'
```

### 3. Lấy danh sách Users

```bash
curl http://localhost:3000/api/users?limit=10
```

### 4. Tìm Posts theo Tag

```bash
curl http://localhost:3000/api/posts/tag/cassandra
```

### 5. Cập nhật User

```bash
curl -X PUT http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000 \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Smith",
    "age": 26
  }'
```

### 6. Xóa Post

```bash
curl -X DELETE http://localhost:3000/api/posts/456e7890-e89b-12d3-a456-426614174001
```

## 🏗️ Kiến trúc Database

### Keyspace: `nodejs_example`

```cql
CREATE KEYSPACE nodejs_example
WITH REPLICATION = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};
```

### Table: Users

```cql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  age INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX users_email_idx ON users (email);
```

### Table: Posts

```cql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID,
  title TEXT,
  content TEXT,
  tags SET<TEXT>,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🔍 Tính năng nâng cao

### 1. Cassandra Set Operations

```javascript
// Thêm tag vào post
await Post.addTag(postId, 'new-tag');

// Xóa tag khỏi post
await Post.removeTag(postId, 'old-tag');

// Tìm posts có chứa tag
const posts = await Post.findByTag('cassandra');
```

### 2. UUID Management

```javascript
const { v4: uuidv4 } = require('uuid');

// Tự động tạo UUID cho records mới
const id = uuidv4();
```

### 3. Prepared Statements

```javascript
// Sử dụng prepared statements để tối ưu performance
await client.execute(query, params, { prepare: true });
```

## 🛠️ Development

### Scripts có sẵn

```bash
npm start              # Khởi động production server
npm run dev            # Development với nodemon
npm run init-db        # Khởi tạo basic database
npm run init-advanced  # Khởi tạo advanced schemas
npm run demo           # Demo basic API
npm run demo-advanced  # Demo advanced patterns
npm run demo-no-joins  # So sánh SQL JOINs vs Cassandra
npm run learn           # Bắt đầu học Cassandra (từ MySQL)
npm run learn-compare   # So sánh interactive MySQL vs Cassandra
```

### Testing API

Import file `postman_collection.json` vào Postman hoặc sử dụng curl commands ở trên.

## 🚨 Troubleshooting

### Lỗi kết nối Cassandra

1. Kiểm tra Cassandra đang chạy:
```bash
# Với Docker
docker ps | grep cassandra

# Kiểm tra port
netstat -an | grep 9042
```

2. Kiểm tra cấu hình trong `.env`

3. Xem logs chi tiết:
```bash
# Docker logs
docker logs cassandra-container

# Application logs
npm run dev
```

### Lỗi Keyspace không tồn tại

```bash
# Chạy lại script init
npm run init-db
```

## 📚 Tài liệu tham khảo

- [Apache Cassandra Documentation](https://cassandra.apache.org/doc/)
- [DataStax Node.js Driver](https://docs.datastax.com/en/developer/nodejs-driver/4.6/)
- [Express.js Guide](https://expressjs.com/)

## 🤝 Contributing

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Tác giả:** Your Name
**Email:** your.email@example.com
**Dự án:** Cassandra + Node.js Example

