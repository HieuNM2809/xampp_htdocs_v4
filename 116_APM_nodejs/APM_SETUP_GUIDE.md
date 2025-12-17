# Hướng Dẫn Cài Đặt APM Server Bằng Docker

## 🚀 Cài Đặt Nhanh

### 1. Khởi chạy APM Stack

```bash
# Khởi chạy tất cả services (Elasticsearch, Kibana, APM Server)
docker-compose up -d

# Xem logs
docker-compose logs -f

# Kiểm tra trạng thái
docker-compose ps
```

### 2. Kiểm Tra Services

- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **APM Server**: http://localhost:8200

```bash
# Test Elasticsearch
curl http://localhost:9200

# Test APM Server
curl http://localhost:8200
```

### 3. Cấu Hình Môi Trường (Tùy chọn)

Tạo file `.env` với nội dung:

```env
# APM Configuration
ELASTIC_APM_ACTIVE=true
ELASTIC_APM_SERVICE_NAME=hsknow-services-local
ELASTIC_APM_SERVER_URL=http://localhost:8200
ELASTIC_APM_ENVIRONMENT=development
ELASTIC_APM_LOG_LEVEL=info
ELASTIC_APM_LOG_FILE=stderr

# Application Settings
NODE_ENV=development
PORT=3000
```

### 4. Chạy Ứng Dụng Node.js

```bash
# Cài đặt dependencies
npm install

# Chạy ứng dụng
npm start
# hoặc
node server.js
```

## 📊 Xem Dữ Liệu APM

1. Truy cập Kibana: http://localhost:5601
2. Đi tới **APM** trong menu bên trái
3. Chọn service **hsknow-services-local**
4. Xem metrics, traces, và errors

## 🛠 Cấu Hình Chi Tiết

### Config.js đã được cập nhật:

```javascript
apm: {
  active: true,
  serviceName: 'hsknow-services-local',
  serverUrl: 'http://localhost:8200',
  environment: 'development',
  // ... các cấu hình khác
}
```

### Docker Services:

- **Elasticsearch**: Port 9200, 9300 - Lưu trữ dữ liệu
- **Kibana**: Port 5601 - Giao diện web
- **APM Server**: Port 8200 - Nhận dữ liệu từ ứng dụng

## 🔧 Troubleshooting

### Kiểm tra logs:
```bash
docker-compose logs elasticsearch
docker-compose logs kibana
docker-compose logs apm-server
```

### Restart services:
```bash
docker-compose down
docker-compose up -d
```

### Reset dữ liệu:
```bash
docker-compose down -v  # Xóa volumes
docker-compose up -d
```

### Memory issues:
Nếu gặp lỗi memory, tăng memory cho Docker:
- Docker Desktop: Settings → Resources → Memory (ít nhất 4GB)

## 🚦 Production Notes

Để sử dụng trong production:
1. Thay đổi passwords mặc định
2. Bật xpack security
3. Sử dụng HTTPS
4. Cấu hình backup
5. Monitoring và alerting

## 🔗 URLs Quan Trọng

- APM Server: http://localhost:8200
- Kibana APM: http://localhost:5601/app/apm
- Elasticsearch: http://localhost:9200/_cat/health
