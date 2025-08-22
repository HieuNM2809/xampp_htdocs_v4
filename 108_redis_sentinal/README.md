### Demo Redis Sentinel + Node.js (ioredis)

Dự án mẫu chạy cụm Redis với Sentinel (1 master, 2 replica, 3 sentinel) bằng Docker Compose và ứng dụng Node.js kết nối thông qua Sentinel, kèm script test failover.

### Yêu cầu
- Docker, Docker Compose
- Node không bắt buộc (đã đóng gói trong container)

### Khởi chạy cụm Redis + Sentinel
```bash
docker compose up -d
```
Chờ tất cả container `redis-master`, `redis-replica-1`, `redis-replica-2`, `redis-sentinel-*` sẵn sàng.

### Chạy ví dụ Node.js (1 lần set/get)
```bash
docker compose run --rm node-app npm run start
```
Kết quả dự kiến hiển thị kết nối qua Sentinel và giá trị `demo:key`.

### Test failover (quan sát chuyển đổi master)
Chạy vòng lặp đọc/ghi liên tục:
```bash
docker compose run --rm node-app npm run test:failover
```
Trong khi script đang chạy, mô phỏng sự cố master:
```bash
# Dừng master
docker compose stop redis-master
# Sau ~5-10s, Sentinel sẽ bầu replica mới làm master
# Khởi động lại master cũ (lúc này sẽ trở thành replica)
docker compose start redis-master
```
Quan sát log: endpoint master/replica sẽ thay đổi sau failover nhưng ứng dụng vẫn tiếp tục set/get bình thường.

### Cấu hình chính
- Sentinel: `sentinel/sentinel*.conf` với `sentinel monitor mymaster redis-master 6379 2`
- Ứng dụng: `node-app/index.js` dùng ioredis với `name = mymaster` và danh sách Sentinel trong biến môi trường `REDIS_SENTINELS`.

### Biến môi trường
- `REDIS_MASTER_NAME` (mặc định `mymaster`)
- `REDIS_SENTINELS` (mặc định `sentinel1:26379,sentinel2:26379,sentinel3:26379`)
- `REDIS_PASSWORD` (nếu cấu hình mật khẩu Redis)

### Dọn dẹp
```bash
docker compose down -v
```

### Ghi chú
- Cấu hình mẫu không bật password để đơn giản hoá demo. Với môi trường thực tế, hãy bật ACL/password cho Redis và Sentinel, đồng thời cấu hình `requirepass`/`masterauth` tương ứng.


