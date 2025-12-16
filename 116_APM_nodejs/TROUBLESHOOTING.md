# 🔧 Troubleshooting Guide - APM Node.js

Hướng dẫn khắc phục các lỗi thường gặp.

## ⚡ Quick Fix - Tắt APM để chạy ngay

Nếu bạn gặp lỗi APM và muốn chạy app ngay:

```bash
# Tắt APM monitoring
npm run apm:off

# Restart app
npm run dev
```

App sẽ chạy bình thường mà không có APM logs spam! ✅

---

## 🚨 Lỗi thường gặp

### 1. APM Server Error 503

**Triệu chứng:**
```
{"log.level":"error",...,"message":"APM Server transport error (503): Unexpected APM Server response when polling config"}
```

**Nguyên nhân:** APM Server chưa sẵn sàng hoặc Elasticsearch chưa khởi động xong.

**Giải pháp:**
```bash
# Option 1: Tắt APM tạm thời
npm run apm:off

# Option 2: Chờ và kiểm tra
npm run check-apm

# Option 3: Restart Docker
docker-compose restart apm-server
```

### 2. APM Server Timeout

**Triệu chứng:**
```
{"log.level":"error",...,"message":"APM Server transport error: APM Server response timeout (10000ms)"}
```

**Giải pháp:**
```bash
# Kiểm tra Docker containers
docker-compose ps

# Nếu APM server bị lỗi, restart
docker-compose restart apm-server elasticsearch
```

### 3. Elasticsearch Out of Memory

**Triệu chứng:**
```
elasticsearch exited with code 137
```

**Giải pháp:**
Chỉnh sửa `docker-compose.yml`:
```yaml
environment:
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"  # Giảm từ 1g xuống 512m
```

### 4. Port đã được sử dụng

**Triệu chứng:**
```
Error: listen EADDRINUSE :::3000
```

**Giải pháp:**
```bash
# Tìm process sử dụng port 3000
netstat -ano | findstr :3000

# Kill process (thay PID bằng số thật)
taskkill /PID <PID> /F

# Hoặc đổi port
set PORT=3001 && npm start
```

---

## 🛠️ Commands hữu ích

### Kiểm tra trạng thái
```bash
# Kiểm tra APM config
npm run apm:status

# Kiểm tra tất cả services
npm run check-apm

# Kiểm tra Docker
docker-compose ps
```

### Control APM
```bash
# Tắt APM
npm run apm:off

# Bật APM 
npm run apm:on

# Xem trạng thái APM
npm run apm:status
```

### Docker commands
```bash
# Xem logs
docker-compose logs elasticsearch
docker-compose logs apm-server
docker-compose logs kibana

# Restart specific service
docker-compose restart apm-server

# Restart all
docker-compose restart

# Stop all
docker-compose down

# Start fresh (remove data)
docker-compose down -v && docker-compose up -d
```

---

## 🎯 Test scenarios

### Test app without APM
```bash
# Tắt APM
npm run apm:off

# Chạy app
npm run dev

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/apm-status
```

### Test app with APM
```bash
# Bật APM
npm run apm:on

# Chạy app
npm run dev

# Load test
npm run test-load
```

---

## ⚙️ Environment Variables

Tạo file `.env` với content:

```bash
# APM Configuration
ELASTIC_APM_SERVER_URL=http://localhost:8200
ELASTIC_APM_SECRET_TOKEN=
ELASTIC_APM_ACTIVE=false    # Set to false để tắt APM

# Application 
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

---

## 🔄 Workflow khuyên dùng

### Development workflow
1. **Bắt đầu project:**
   ```bash
   npm run apm:off    # Tắt APM
   npm run dev        # Develop ứng dụng
   ```

2. **Khi muốn test APM:**
   ```bash
   docker-compose up -d       # Start Elastic Stack
   npm run check-apm          # Đợi services ready
   npm run apm:on            # Bật APM
   npm run dev               # Restart app
   ```

3. **Khi không cần APM:**
   ```bash
   npm run apm:off    # Tắt APM  
   docker-compose down # Stop Docker (optional)
   ```

### Production workflow
- Set `ELASTIC_APM_ACTIVE=true` trong production
- Sử dụng proper Elasticsearch cluster
- Enable security và authentication

---

## 📞 Support

Nếu vẫn gặp lỗi:

1. **Check app status**: GET http://localhost:3000/health
2. **Check APM status**: GET http://localhost:3000/apm-status
3. **Run diagnostics**: `npm run check-apm`
4. **View logs**: `docker-compose logs`

**Most common fix**: `npm run apm:off` và restart app! 🎯
