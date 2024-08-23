Để sử dụng Redis với `express-rate-limit`, bạn cần cài đặt thêm gói `rate-limit-redis`. Dưới đây là ví dụ nâng cao về việc sử dụng Redis trên cổng 6380 để làm backend cho rate limiting.

### Bước 1: Cài đặt các gói cần thiết
```bash
npm install express-rate-limit rate-limit-redis ioredis
```

### Bước 2: Cài đặt Redis và tạo một rate limiter với Redis
```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const app = express();

// Kết nối tới Redis trên port 6380
const redisClient = new Redis({
  port: 6380, // port của Redis
  host: '127.0.0.1', // địa chỉ của Redis server
});

// Định nghĩa rate limiter với Redis store
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn mỗi IP chỉ được thực hiện 100 request trong windowMs
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút',
  keyGenerator: (req) => req.ip, // Tạo khóa dựa trên IP của request
});

// Áp dụng rate limiter cho tất cả các request
app.use(limiter);

app.get('/', (req, res) => {
  res.send('Xin chào!');
});

app.listen(3000, () => {
  console.log('Server đang chạy trên port 3000');
});
```

### Giải thích chi tiết:
1. **Kết nối Redis**:
    - Ở đây, `ioredis` được sử dụng để kết nối đến Redis server chạy trên cổng 6380. Bạn có thể thay đổi `host` và `port` tùy theo cấu hình của mình.

2. **Sử dụng Redis làm store**:
    - `rate-limit-redis` cho phép bạn sử dụng Redis như một kho lưu trữ để lưu thông tin về các yêu cầu của người dùng. Điều này rất hữu ích trong môi trường có nhiều instance của ứng dụng vì Redis giúp đồng bộ dữ liệu giữa các instance.

3. **Cấu hình rate limiter**:
    - `windowMs` và `max` được cấu hình giống như ví dụ cơ bản, nhưng giờ đây thông tin về các request sẽ được lưu trữ trong Redis thay vì chỉ trong bộ nhớ.

4. **Key Generator**:
    - `keyGenerator` được sử dụng để xác định cách xác định khóa cho mỗi yêu cầu. Trong trường hợp này, chúng ta sử dụng địa chỉ IP của request làm khóa.

### Lợi ích của việc sử dụng Redis:
- **Phân phối tải**: Khi sử dụng Redis, bạn có thể chạy nhiều instance của ứng dụng mà vẫn đảm bảo rằng rate limiting hoạt động chính xác, vì tất cả các instance đều chia sẻ cùng một kho lưu trữ Redis.
- **Khả năng mở rộng**: Redis có thể xử lý một lượng lớn request đồng thời và lưu trữ dữ liệu trong bộ nhớ, giúp tăng tốc độ truy cập và xử lý.

Với cấu hình này, bạn đã thiết lập một hệ thống rate limiting mạnh mẽ và linh hoạt cho ứng dụng Express của mình, với Redis làm backend.