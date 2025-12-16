# 🚀 Hướng dẫn chạy Elastic APM với Node.js

## Yêu cầu hệ thống

- Docker & Docker Compose
- Node.js 16+ 
- RAM: tối thiểu 4GB (khuyến nghị 8GB+)

## 🔧 Bước 1: Clone và cài đặt

```bash
# Clone project (nếu từ Git)
git clone <repository-url>
cd elastic-apm-nodejs-example

# Cài dependencies
npm install
```

## 🐳 Bước 2: Chạy Elastic Stack

```bash
# Khởi động Elasticsearch, Kibana, APM Server, Redis, PostgreSQL
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f
```

**⏳ Chờ tất cả services khởi động (khoảng 2-3 phút)**

### Kiểm tra services

```bash
# Elasticsearch
curl http://localhost:9200

# APM Server  
curl http://localhost:8200

# Kibana (trên trình duyệt)
open http://localhost:5601
```

## 🚀 Bước 3: Chạy Node.js App

```bash
# Development mode
npm run dev

# Production mode
npm start
```

**App sẽ chạy trên:** http://localhost:3000

## 📊 Bước 4: Kiểm tra APM trong Kibana

1. Mở Kibana: http://localhost:5601
2. Vào menu **Observability → APM**
3. Gọi một vài API để tạo dữ liệu:

```bash
# Test các API
curl http://localhost:3000/api/ping
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl http://localhost:3000/api/external-data
curl http://localhost:3000/api/dashboard

# Test error tracking
curl http://localhost:3000/api/error-test?type=validation
```

4. Quay lại Kibana APM → thấy service **"location-service"**
5. Click vào để xem traces, metrics, errors

## 🔥 Các API có sẵn để test

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Health check (ignored by APM) |
| GET | `/api/ping` | Simple ping test |
| GET | `/api/users` | Lấy danh sách users (DB + Cache) |
| GET | `/api/users/:id` | Lấy user theo ID (DB + Cache) |
| GET | `/api/external-data` | Call external API |
| POST | `/api/heavy-task` | CPU intensive task |
| GET | `/api/dashboard` | Multiple parallel operations |
| GET | `/api/error-test` | Test error tracking |

## 🧪 Load Testing

```bash
# Cài Artillery (nếu chưa có)
npm install -g artillery

# Chạy load test
npm run load-test
```

## 📈 Monitoring Features

### 1. **Transactions** 
- HTTP requests tự động được track
- Latency, throughput, p95/p99
- Distributed tracing

### 2. **Spans**
- Database queries
- Redis operations  
- External HTTP calls
- Custom business logic

### 3. **Errors**
- Automatic exception capture
- Custom error context
- Error rate tracking

### 4. **Metrics**
- System metrics (CPU, Memory)
- Custom business metrics
- Service dependencies

## 🛠️ Configuration

### Environment Variables (.env)

```bash
# APM Settings
ELASTIC_APM_SERVICE_NAME=location-service
ELASTIC_APM_SERVER_URL=http://localhost:8200
ELASTIC_APM_ENVIRONMENT=development
ELASTIC_APM_TRANSACTION_SAMPLE_RATE=1.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=apm_demo
DB_USER=postgres
DB_PASSWORD=postgres

# Redis  
REDIS_HOST=localhost
REDIS_PORT=6379
```

### APM Configuration (apm.js)

Key settings:

- `transactionSampleRate`: 1.0 = 100% requests
- `ignoreUrls`: Skip health checks
- `captureBody`: Capture request/response bodies
- `environment`: development/production

## 🎯 Production Tips

### 1. Giảm Sample Rate
```bash
ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1  # 10%
```

### 2. Security
```bash
# Bật authentication cho Elasticsearch
xpack.security.enabled=true
```

### 3. Performance
```bash
# Tăng memory cho Elasticsearch
ES_JAVA_OPTS=-Xms2g -Xmx2g
```

## 🐛 Troubleshooting

### APM không thấy data

1. **Check APM server:**
   ```bash
   curl http://localhost:8200
   ```

2. **Check Node.js logs:**
   ```bash
   # Phải thấy: "🚀 Elastic APM initialized..."
   ```

3. **Check Docker logs:**
   ```bash
   docker-compose logs elasticsearch
   docker-compose logs apm-server
   ```

### Performance issues

1. **Giảm sample rate:**
   ```bash
   ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1
   ```

2. **Ignore health checks:**
   ```js
   ignoreUrls: ['/health', '/ping', '/status']
   ```

3. **Tăng memory cho Elasticsearch:**
   ```yaml
   environment:
     - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
   ```

## 🧹 Cleanup

```bash
# Stop tất cả containers
docker-compose down

# Xóa volumes (mất data)
docker-compose down -v

# Xóa images  
docker system prune -a
```

## 📚 Tài liệu thêm

- [Elastic APM Node.js Agent](https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html)
- [APM Server Configuration](https://www.elastic.co/guide/en/apm/server/current/index.html)
- [Kibana APM UI](https://www.elastic.co/guide/en/kibana/current/apm-ui.html)

---

## 🎉 Chúc mừng!

Bạn đã có một hệ thống monitoring hoàn chỉnh với:
- ✅ Elastic APM tracking
- ✅ Database operations monitoring  
- ✅ Cache performance tracking
- ✅ Error tracking & alerting
- ✅ Custom business metrics
- ✅ Distributed tracing

**Giờ có thể phân tích performance và debug issues một cách chuyên nghiệp! 🚀**
