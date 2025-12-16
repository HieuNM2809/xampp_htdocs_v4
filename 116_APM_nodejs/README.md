# APM Node.js với Elastic Stack - Ví dụ cơ bản

Đây là một ví dụ cơ bản về cách tích hợp APM (Application Performance Monitoring) với Node.js và Elastic Stack.

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt](#cài-đặt)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Endpoints](#api-endpoints)
- [Giám sát với Kibana](#giám-sát-với-kibana)
- [Tính năng APM](#tính-năng-apm)

## 🚀 Giới thiệu

Ví dụ này demonstate cách:
- Cấu hình APM agent cho Node.js
- Tạo custom spans và metrics
- Track errors và exceptions
- Monitor performance của API endpoints
- Sử dụng Kibana để visualize dữ liệu APM

## 📋 Yêu cầu

- Node.js >= 14.x
- Docker và Docker Compose
- Ít nhất 4GB RAM cho Elastic Stack

## ⚙️ Cài đặt

### 1. Clone và cài đặt dependencies

```bash
# Cài đặt Node.js dependencies
npm install
```

### 2. Cấu hình environment variables

```bash
# Copy file .env.example
cp .env.example .env

# Chỉnh sửa file .env nếu cần
```

### 3. Khởi động Elastic Stack

```bash
# Khởi động Elasticsearch, Kibana, và APM Server
docker-compose up -d

# Kiểm tra trạng thái services
docker-compose ps
```

**⏱️ Chờ đợi**: Elastic Stack cần khoảng 2-3 phút để khởi động hoàn toàn.

### 4. Verify Elastic Stack

Kiểm tra các services đã sẵn sàng:

```bash
# Elasticsearch
curl http://localhost:9200

# APM Server  
curl http://localhost:8200

# Kibana (mở browser)
# http://localhost:5601
```

## 🏃 Chạy ứng dụng

### Bước 1: Kiểm tra Elastic Stack
```bash
# Kiểm tra xem các services đã sẵn sàng chưa
npm run check-apm
```

### Bước 2: Chạy ứng dụng

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Load testing:**
```bash
npm run test-load
```

Ứng dụng sẽ chạy tại: http://localhost:3000

> **💡 Lưu ý**: Ứng dụng sẽ chạy bình thường ngay cả khi APM Server chưa sẵn sàng, chỉ là không có monitoring data.

## 📡 API Endpoints

### 1. Health Check
```bash
GET /health
```

### 2. Home
```bash
GET /
```

### 3. Users List (với DB simulation)
```bash
GET /api/users
```

### 4. Random Error (để test error tracking)
```bash
GET /api/error
```

### 5. Slow Operation (để test performance)
```bash
GET /api/slow?delay=3000
```

### 6. Custom Metrics
```bash
GET /api/metrics
```

## 📊 Giám sát với Kibana

### 1. Truy cập Kibana
Mở browser và truy cập: http://localhost:5601

### 2. Setup APM
1. Vào **Observability** → **APM**
2. Chờ một vài phút để dữ liệu xuất hiện
3. Bạn sẽ thấy service `nodejs-apm-example`

### 3. Tạo traffic để test
```bash
# Chạy một vài requests để tạo dữ liệu
curl http://localhost:3000/
curl http://localhost:3000/api/users
curl http://localhost:3000/api/slow?delay=2000
curl http://localhost:3000/api/error
curl http://localhost:3000/api/metrics
```

### 4. Explore APM Data
Trong Kibana APM, bạn có thể xem:
- **Services**: Danh sách các services
- **Traces**: Chi tiết từng request
- **Dependencies**: Service map
- **Errors**: Error tracking và stack traces
- **Metrics**: Performance metrics

## 🔧 Tính năng APM

### Custom Spans
```javascript
const span = apm.startSpan('my-operation');
try {
  // Your code here
} finally {
  if (span) span.end();
}
```

### Error Tracking
```javascript
try {
  // Code that might throw
} catch (error) {
  apm.captureError(error);
  throw error;
}
```

### Custom Labels/Tags
```javascript
apm.setLabel('user_id', 12345);
apm.setLabel('feature_flag', 'enabled');
```

### Transaction Name
```javascript
apm.setTransactionName('custom-transaction-name');
```

## 📁 Cấu trúc Project

```
116_APM_nodejs/
├── app.js                 # Main application
├── package.json          # Dependencies
├── docker-compose.yml    # Elastic Stack setup
├── .env.example         # Environment variables template
└── README.md           # Tài liệu này
```

## 🛠️ Troubleshooting

### Lỗi khi khởi động ứng dụng

**Lỗi: "Cannot read properties of undefined (reading 'serverUrl')"**
- **Nguyên nhân**: APM Server chưa sẵn sàng
- **Giải pháp**: Chạy `npm run check-apm` để kiểm tra services

**Lỗi: "APM Server transport error (503)"**
- **Nguyên nhân**: APM Server chưa hoàn toàn khởi động
- **Giải pháp**: Chờ thêm 2-3 phút và thử lại

### Kiểm tra Services
```bash
# Kiểm tra tất cả services
npm run check-apm

# Kiểm tra Docker containers
docker-compose ps

# Xem logs của từng service
docker-compose logs elasticsearch
docker-compose logs apm-server
docker-compose logs kibana
```

### APM Server không kết nối được
```bash
# Kiểm tra APM Server
curl http://localhost:8200

# Restart APM Server nếu cần
docker-compose restart apm-server
```

### Elasticsearch không đủ memory
```bash
# Tăng memory limit trong docker-compose.yml
# Thay đổi ES_JAVA_OPTS từ -Xms1g -Xmx1g thành -Xms2g -Xmx2g
```

### Kibana load chậm
```bash
# Chờ Elasticsearch sẵn sàng
curl "http://localhost:9200/_cluster/health?wait_for_status=green&timeout=60s"
```

### Ports bị chiếm dụng
Nếu ports 9200, 5601, hoặc 8200 đã được sử dụng:
```bash
# Kiểm tra process sử dụng port
netstat -ano | findstr :9200
netstat -ano | findstr :5601  
netstat -ano | findstr :8200

# Hoặc thay đổi ports trong docker-compose.yml
```

## 🔄 Development Tips

### 1. Hot Reload
Sử dụng `nodemon` để auto-restart khi code thay đổi:
```bash
npm run dev
```

### 2. Debug APM
Bật debug mode trong APM:
```javascript
const apm = require('elastic-apm-node').start({
  logLevel: 'debug'
});
```

### 3. Disable APM trong Testing
```javascript
const apm = require('elastic-apm-node').start({
  active: process.env.NODE_ENV !== 'test'
});
```

## 🧹 Cleanup

Để dọn dẹp resources:
```bash
# Stop containers
docker-compose down

# Remove volumes (sẽ xóa hết dữ liệu)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 📚 Tài liệu tham khảo

- [Elastic APM Node.js Agent](https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html)
- [APM Server](https://www.elastic.co/guide/en/apm/server/current/index.html)
- [Kibana APM UI](https://www.elastic.co/guide/en/kibana/current/apm-getting-started.html)

---

💡 **Lưu ý**: Cấu hình này chỉ dành cho development. Trong production, hãy bật security cho Elasticsearch và sử dụng proper authentication.
