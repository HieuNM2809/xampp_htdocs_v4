# 🚀 Hướng dẫn nhanh - Getting Started

## Bước 1: Cài đặt Cassandra

### Sử dụng Docker (Khuyến nghị)
```bash
# Chạy Cassandra container
docker run --name cassandra-db -p 9042:9042 -d cassandra:3.11

# Đợi Cassandra khởi động (khoảng 2-3 phút)
docker logs -f cassandra-db
```

### Kiểm tra Cassandra đã sẵn sàng
```bash
# Kiểm tra port 9042 có mở không
netstat -an | grep 9042

# Hoặc kiểm tra bằng telnet
telnet localhost 9042
```

## Bước 2: Cài đặt dependencies

```bash
# Cài đặt Node.js packages
npm install
```

## Bước 3: Cấu hình môi trường

```bash
# Copy file cấu hình
cp .env.example .env

# Chỉnh sửa .env nếu cần (mặc định là OK)
```

## Bước 4: Khởi tạo database

```bash
# Tạo keyspace và tables
npm run init-db
```

Bạn sẽ thấy output như sau:
```
🚀 Bắt đầu khởi tạo database...
✅ Đã kết nối với Cassandra cluster
✅ Đã tạo keyspace: nodejs_example
✅ Đã tạo bảng users
✅ Đã tạo bảng posts
✅ Đã tạo index cho email
🎉 Khởi tạo database hoàn thành!
```

## Bước 5: Khởi động server

```bash
# Development mode (tự động restart khi có thay đổi)
npm run dev

# Hoặc production mode
npm start
```

Server sẽ khởi động tại: http://localhost:3000

## Bước 6: Kiểm tra API

### Health Check
```bash
curl http://localhost:3000/health
```

### API Root
```bash
curl http://localhost:3000
```

## Bước 7: Test API với demo

```bash
# Chạy demo tự động
npm run demo
```

## ✅ Quick Test Commands

```bash
# Tạo user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","age":25}'

# Lấy danh sách users
curl http://localhost:3000/api/users

# Tạo post (thay USER_ID bằng ID user từ bước trên)
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"user_id":"USER_ID","title":"Hello","content":"My first post","tags":["test"]}'

# Lấy posts theo tag
curl http://localhost:3000/api/posts/tag/test
```

## 🛠️ Troubleshooting

### Lỗi kết nối Cassandra
- Đảm bảo Cassandra container đang chạy: `docker ps`
- Kiểm tra logs: `docker logs cassandra-db`
- Restart container: `docker restart cassandra-db`

### Lỗi "Keyspace not found"
- Chạy lại: `npm run init-db`

### Port 3000 đã được sử dụng
- Thay đổi PORT trong `.env`: `PORT=3001`
- Hoặc kill process: `lsof -ti:3000 | xargs kill`

## 📚 Các file quan trọng

- **server.js** - Main server file
- **config/database.js** - Cassandra connection
- **models/** - Database models (User, Post)
- **routes/** - API endpoints
- **scripts/init-database.js** - Database setup
- **examples/api-examples.js** - Demo script

## 🎯 Next Steps

1. Xem **README.md** để biết chi tiết về API
2. Chỉnh sửa models trong `models/`
3. Thêm routes mới trong `routes/`
4. Deploy lên production

**Happy coding! 🚀**

