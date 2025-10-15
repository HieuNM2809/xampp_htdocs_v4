# Node.js Kafka Example với Docker

Ví dụ hoàn chỉnh về cách kết nối và sử dụng Apache Kafka với Node.js trong môi trường Docker. Project này cung cấp một template production-ready để làm việc với Kafka.

## 🚀 Tính năng

- ✅ **Kafka Producer** với khả năng gửi message đơn lẻ và batch
- ✅ **Kafka Consumer** với xử lý message và batch processing
- ✅ **RESTful API** để tương tác với Kafka thông qua HTTP
- ✅ **Docker Compose** setup hoàn chỉnh với Kafka, Zookeeper và Kafka UI
- ✅ **Graceful shutdown** handling cho production
- ✅ **Error handling** và retry mechanisms
- ✅ **Health check** endpoints cho monitoring
- ✅ **Logging** chi tiết với emoji để dễ đọc
- ✅ **TypeScript-ready** codebase structure
- ✅ **SASL Authentication** support (PLAIN, SCRAM-SHA-256)
- ✅ **SSL/TLS encryption** ready for production

## 📋 Yêu cầu

- Docker và Docker Compose
- Node.js 18+ (nếu chạy local)

## 🛠️ Cài đặt

### Sử dụng Docker Compose (Khuyên dùng)

1. **Clone repository và navigate to project:**
```bash
cd 111_authen_kafka
```

2. **Tạo file environment:**
```bash
cp .env.example .env
```

3. **Start tất cả services:**
```bash
docker-compose up -d
```

4. **Check logs:**
```bash
docker-compose logs -f nodejs-app
```

### Chạy Local Development

1. **Start Kafka ecosystem:**
```bash
docker-compose up -d kafka zookeeper kafka-ui
```

2. **Install dependencies:**
```bash
npm install
# hoặc
npm i
```

3. **Tạo file environment:**
```bash
cp .env.example .env
# Chỉnh sửa KAFKA_BROKERS=localhost:9092 cho local development
```

4. **Start ứng dụng:**
```bash
# Development mode với auto-reload
npm run dev

# Production mode
npm start
```

## 🔐 Authentication Setup

Dự án support cả non-authenticated và authenticated Kafka connections.

### Mode 1: Không Authentication (Default)

```bash
# Sử dụng .env với KAFKA_BROKERS=localhost:9092
docker-compose up -d
```

### Mode 2: Với SASL Authentication

1. **Cấu hình authentication:**
```bash
cp .env.auth.example .env
```

2. **Edit .env file:**
```env
KAFKA_BROKERS=localhost:9093
KAFKA_USERNAME=nodejs-app
KAFKA_PASSWORD=nodejs-app-secret
KAFKA_SASL_MECHANISM=plain
```

3. **Start với authentication:**
```bash
docker-compose up -d
```

### 🔑 Available Users & Passwords

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin-secret` | Super user |
| `kafka-admin` | `kafka-admin-secret` | Super user |
| `nodejs-app` | `nodejs-app-secret` | Application user |
| `producer` | `producer-secret` | Producer only |
| `consumer` | `consumer-secret` | Consumer only |
| `demo-user` | `demo-password` | Demo/test |

### 🛡️ SCRAM Authentication (Advanced)

Để sử dụng SCRAM-SHA-256 (an toàn hơn PLAIN):

1. **Update .env:**
```env
KAFKA_SASL_MECHANISM=scram-sha-256
```

2. **Tạo SCRAM users:**
```bash
# Linux/Mac
./kafka-config/create-scram-users.sh

# Windows (manual)
docker exec kafka kafka-configs ^
  --bootstrap-server localhost:29092 ^
  --alter ^
  --add-config "SCRAM-SHA-256=[password=nodejs-app-secret]" ^
  --entity-type users ^
  --entity-name nodejs-app
```

## 🌐 Endpoints

### API Base URL: `http://localhost:3000`

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| POST | `/produce` | Gửi message đến Kafka |
| POST | `/produce/batch` | Gửi batch messages |
| POST | `/consume/start` | Bắt đầu consume messages |
| POST | `/consume/stop` | Dừng consumer |
| GET | `/consumers` | List active consumers |

### Kafka UI: `http://localhost:8080`

## 📝 Ví dụ sử dụng

### 1. Gửi message đơn lẻ

```bash
curl -X POST http://localhost:3000/produce \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "user-events",
    "key": "user-123",
    "message": {
      "userId": 123,
      "action": "login",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }'
```

### 2. Gửi batch messages

```bash
curl -X POST http://localhost:3000/produce/batch \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "order-events",
    "messages": [
      {
        "key": "order-001",
        "value": {
          "orderId": "001",
          "userId": 123,
          "amount": 99.99,
          "status": "pending"
        }
      },
      {
        "key": "order-002",
        "value": {
          "orderId": "002",
          "userId": 456,
          "amount": 149.99,
          "status": "confirmed"
        }
      }
    ]
  }'
```

### 3. Bắt đầu consume messages

```bash
curl -X POST http://localhost:3000/consume/start \\
  -H "Content-Type: application/json" \\
  -d '{
    "topics": ["user-events", "order-events"],
    "groupId": "my-consumer-group"
  }'
```

### 4. Dừng consumer

```bash
curl -X POST http://localhost:3000/consume/stop \\
  -H "Content-Type: application/json" \\
  -d '{
    "groupId": "my-consumer-group"
  }'
```

## 🔧 Chạy Producer/Consumer độc lập

### Producer

```bash
# Chạy ví dụ producer
npm run producer

# Hoặc
node producer.js
```

### Consumer

```bash
# Chạy ví dụ consumer thông thường
npm run consumer

# Hoặc
node consumer.js

# Chạy batch consumer
node consumer.js --batch
```

## 🏗️ Cấu trúc dự án

```
111_authen_kafka/
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Node.js app Dockerfile
├── package.json         # Node.js dependencies và scripts
├── .env.example         # Environment variables template
├── .env                # Local environment config (auto-created)
├── .dockerignore        # Docker ignore patterns
├── index.js            # Express API server với RESTful endpoints
├── producer.js         # Kafka Producer class với KafkaJS
├── consumer.js         # Kafka Consumer class với batch processing
├── README.md          # Documentation chi tiết
└── scripts/           # Thư mục scripts bổ sung
```

### 📦 Dependencies chính

- **kafkajs**: Modern Kafka client cho Node.js
- **express**: Web framework cho REST API
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variables management
- **nodemon**: Development auto-reload (dev dependency)

## ⚙️ Configuration

### Environment Variables

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092

# Node.js Application
PORT=3000
NODE_ENV=development
```

### Docker Services

- **Zookeeper**: Port 2181
- **Kafka**:
  - PLAINTEXT: 9092 (external), 29092 (internal)
  - SASL_PLAINTEXT: 9093 (external), 29093 (internal)
- **Kafka UI**: Port 8080
- **Node.js App**: Port 3000

## 🔍 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Kafka UI

Truy cập [http://localhost:8080](http://localhost:8080) để:
- Xem topics và partitions
- Monitor message throughput
- Browse messages
- Manage consumer groups

### Docker Logs

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs specific service
docker-compose logs -f nodejs-app
docker-compose logs -f kafka
```

## 🛠️ Development

### Tạo topic mới

```bash
# Connect vào Kafka container
docker-compose exec kafka bash

# Tạo topic
kafka-topics --create \\
  --bootstrap-server localhost:29092 \\
  --replication-factor 1 \\
  --partitions 3 \\
  --topic my-new-topic

# List topics
kafka-topics --list --bootstrap-server localhost:29092
```

### Testing Producer/Consumer

1. **Terminal 1 - Start Consumer:**
```bash
node consumer.js
```

2. **Terminal 2 - Send Messages:**
```bash
node producer.js
```

3. **Monitor trong Kafka UI:**
- Truy cập http://localhost:8080
- Xem topics `user-events`, `order-events`, `heartbeat`

## 🚨 Troubleshooting

### Kafka không connect được

1. **Check container status:**
```bash
docker-compose ps
```

2. **Check Kafka logs:**
```bash
docker-compose logs kafka
docker-compose logs zookeeper
```

3. **Restart services theo thứ tự:**
```bash
docker-compose down
docker-compose up -d zookeeper
sleep 10
docker-compose up -d kafka
sleep 15
docker-compose up -d
```

### Node.js app lỗi kết nối

1. **Kiểm tra KAFKA_BROKERS trong .env:**
```bash
# Trong Docker container: kafka:29092
# Local development: localhost:9092
```

2. **Check network connectivity:**
```bash
docker-compose exec nodejs-app ping kafka
docker-compose exec nodejs-app telnet kafka 29092
```

3. **Xem logs chi tiết:**
```bash
docker-compose logs -f nodejs-app
```

### Consumer không nhận messages

1. **Check consumer groups:**
```bash
curl http://localhost:3000/consumers

# Hoặc check trực tiếp trong Kafka
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:29092 \
  --list
```

2. **Reset consumer offset:**
```bash
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:29092 \
  --group your-group-id \
  --reset-offsets \
  --to-earliest \
  --topic your-topic \
  --execute
```

3. **Check topic tồn tại:**
```bash
docker-compose exec kafka kafka-topics \
  --bootstrap-server localhost:29092 \
  --list
```

### Port conflicts

Nếu gặp lỗi port đã được sử dụng, có thể thay đổi ports trong `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # API server
  - "8081:8080"  # Kafka UI
  - "9093:9092"  # Kafka broker
```

## ⚡ Performance Tips & Best Practices

### 🚀 Production Optimization

1. **Producer Settings:**
```javascript
const producer = kafka.producer({
  maxInFlightRequests: 5,        // Tăng throughput
  idempotent: true,             // Đảm bảo exactly-once
  transactionTimeout: 30000,
  retries: Number.MAX_VALUE,    // Auto retry
  compression: 'gzip',          // Nén messages
});
```

2. **Consumer Settings:**
```javascript
const consumer = kafka.consumer({
  groupId: 'my-group',
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  maxWaitTimeInMs: 100,         // Giảm latency
  minBytes: 1,                  // Min bytes to fetch
  maxBytes: 1024 * 1024,        // Max bytes per request
});
```

3. **Batch Processing:**
- Sử dụng `sendBatchMessages()` cho producer
- Implement batch consumer với `consumeWithBatch()`
- Tối ưu batch size và timeout

4. **Error Handling:**
- Implement retry logic với exponential backoff
- Dead letter queue cho failed messages
- Monitor và alert cho failed consumers

### 🔒 Security Best Practices

**Development (SASL/PLAIN):**
```env
KAFKA_BROKERS=localhost:9093
KAFKA_USERNAME=nodejs-app
KAFKA_PASSWORD=nodejs-app-secret
KAFKA_SASL_MECHANISM=plain
```

**Production (SASL/SCRAM + SSL):**
```env
KAFKA_BROKERS=your-kafka-cluster:9093
KAFKA_USERNAME=your-app-user
KAFKA_PASSWORD=your-strong-password
KAFKA_SASL_MECHANISM=scram-sha-256
KAFKA_SSL=true
KAFKA_SSL_CA=/path/to/ca-cert.pem
KAFKA_SSL_CERT=/path/to/client-cert.pem
KAFKA_SSL_KEY=/path/to/client-key.pem
```

**Docker Security Config:**
```yaml
environment:
  KAFKA_SECURITY_INTER_BROKER_PROTOCOL: SASL_SSL
  KAFKA_SASL_MECHANISM_INTER_BROKER_PROTOCOL: SCRAM-SHA-256
  KAFKA_SASL_ENABLED_MECHANISMS: SCRAM-SHA-256,SCRAM-SHA-512
  KAFKA_AUTHORIZER_CLASS_NAME: kafka.security.authorizer.AclAuthorizer
  KAFKA_SUPER_USERS: User:admin;User:kafka-admin
```

### 📊 Monitoring

- Sử dụng Kafka UI cho visualization
- Monitor consumer lag
- Track throughput metrics
- Setup health checks

## 📚 Tài liệu tham khảo

- [KafkaJS Documentation](https://kafka.js.org/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Kafka Performance Tuning](https://kafka.apache.org/documentation/#tuning)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 🎯 Quick Start Commands

### Without Authentication (Default)

```bash
# 🚀 Start everything (no auth)
docker-compose up -d

# 🔍 Check all services running
docker-compose ps

# 📤 Send test message
curl -X POST http://localhost:3000/produce \
  -H "Content-Type: application/json" \
  -d '{"topic":"test","key":"key1","message":{"text":"Hello Kafka!","timestamp":"'$(date -Iseconds)'"}}'
```

### With Authentication

```bash
# 🔐 Setup authentication
cp .env.auth.example .env
# Edit .env: uncomment KAFKA_USERNAME, KAFKA_PASSWORD, etc.

# 🚀 Start with authentication
docker-compose up -d

# ✅ Verify authentication logs
docker-compose logs nodejs-app | grep -i "authentication\|sasl"

# 📤 Send authenticated message
curl -X POST http://localhost:3000/produce \
  -H "Content-Type: application/json" \
  -d '{"topic":"secure-test","key":"auth-key1","message":{"text":"Hello Secured Kafka!","user":"authenticated-user","timestamp":"'$(date -Iseconds)'"}}'
```

### Common Commands

```bash
# 🎧 Start consumer
curl -X POST http://localhost:3000/consume/start \
  -H "Content-Type: application/json" \
  -d '{"topics":["test"],"groupId":"quick-start-group"}'

# 📦 Send batch messages
curl -X POST http://localhost:3000/produce/batch \
  -H "Content-Type: application/json" \
  -d '{
    "topic":"test",
    "messages":[
      {"key":"msg1","value":{"type":"order","id":1,"status":"created"}},
      {"key":"msg2","value":{"type":"order","id":2,"status":"processing"}},
      {"key":"msg3","value":{"type":"order","id":3,"status":"completed"}}
    ]
  }'

# 💓 Check health
curl http://localhost:3000/health

# 📊 View Kafka UI (trong browser)
# http://localhost:8080

# 🛑 Stop consumer
curl -X POST http://localhost:3000/consume/stop \
  -H "Content-Type: application/json" \
  -d '{"groupId":"quick-start-group"}'

# 🗂️ List active consumers
curl http://localhost:3000/consumers

# 🧹 Clean up everything
docker-compose down -v
```

### 🔧 Development Commands

```bash
# 🔄 Rebuild và restart
docker-compose down && docker-compose build && docker-compose up -d

# 📝 View logs
docker-compose logs -f nodejs-app
docker-compose logs -f kafka

# 💾 Access Kafka container
docker-compose exec kafka bash

# 🔍 List all topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:29092 --list

# 📊 Describe specific topic
docker-compose exec kafka kafka-topics --bootstrap-server localhost:29092 --describe --topic test
```

---

🎉 **Happy Kafka-ing!** 🎉

> **Tip**: Mở Kafka UI tại [http://localhost:8080](http://localhost:8080) để monitor messages theo thời gian thực!
