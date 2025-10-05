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
- **Kafka**: Ports 9092, 29092
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
```

3. **Restart services:**
```bash
docker-compose restart
```

### Node.js app lỗi kết nối

1. **Kiểm tra KAFKA_BROKERS trong .env:**
```bash
# Trong Docker: kafka:29092
# Local development: localhost:9092
```

2. **Check network connectivity:**
```bash
docker-compose exec nodejs-app ping kafka
```

### Consumer không nhận messages

1. **Check consumer group:**
```bash
curl http://localhost:3000/consumers
```

2. **Reset consumer offset:**
```bash
docker-compose exec kafka kafka-consumer-groups \\
  --bootstrap-server localhost:29092 \\
  --group your-group-id \\
  --reset-offsets \\
  --to-earliest \\
  --topic your-topic \\
  --execute
```

## 📚 Tài liệu tham khảo

- [KafkaJS Documentation](https://kafka.js.org/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

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

```bash
# Start everything
docker-compose up -d

# Send test message
curl -X POST http://localhost:3000/produce \\
  -H "Content-Type: application/json" \\
  -d '{"topic":"test","key":"key1","message":{"text":"Hello Kafka!"}}'

# Start consumer
curl -X POST http://localhost:3000/consume/start \\
  -H "Content-Type: application/json" \\
  -d '{"topics":["test"],"groupId":"test-group"}'

# Check health
curl http://localhost:3000/health

# Stop everything
docker-compose down
```

🎉 **Happy Kafka-ing!** 🎉
