Để kết hợp `recachegoose` với Redis và MongoDB trong một ứng dụng Node.js, ta sẽ sử dụng `mongoose` cho MongoDB và `ioredis` cho Redis. Sau đó, ta sẽ cấu hình `recachegoose` để cache dữ liệu MongoDB vào Redis.

### 1. Cài đặt các package cần thiết

```bash
npm install mongoose ioredis recachegoose
```

### 2. Cấu trúc thư mục dự án

```
project/
│
├── models/
│   └── user.js
├── config/
│   └── redis.js
│   └── mongo.js
├── app.js
└── package.json
```

### 3. Cấu hình Redis trong `config/redis.js`

```js
const Redis = require('ioredis');

// Kết nối đến Redis trên cổng 6380
const redis = new Redis({
  port: 6380,  // Cổng Redis
  host: '127.0.0.1', // Địa chỉ Redis
  password: 'your_redis_password',  // Nếu có password
  db: 0,
});

module.exports = redis;
```

### 4. Cấu hình MongoDB trong `config/mongo.js`

```js
const mongoose = require('mongoose');

async function connectMongo() {
  try {
    await mongoose.connect('mongodb://localhost:27017/your_database', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
  }
}

module.exports = connectMongo;
```

### 5. Định nghĩa model `User` trong `models/user.js`

```js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
```

### 6. Tích hợp `recachegoose` và cấu hình cache trong `app.js`

```js
const express = require('express');
const mongoose = require('mongoose');
const recachegoose = require('recachegoose');
const redis = require('./config/redis');
const connectMongo = require('./config/mongo');
const User = require('./models/user');

const app = express();
const PORT = 3000;

// Kết nối MongoDB
connectMongo();

// Cấu hình recachegoose với Redis
recachegoose(mongoose, redis);

// Route để lấy danh sách user từ cache
app.get('/users', async (req, res) => {
  try {
    // Sử dụng cache với TTL là 30 giây
    const users = await User.find().cache(30);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xóa cache thủ công khi cần
app.get('/clear-cache', async (req, res) => {
  try {
    await recachegoose.clearCache();
    res.json({ message: 'Cache cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 7. Giải thích các bước quan trọng

- **Kết nối Redis và MongoDB:** Ta đã thiết lập `ioredis` để kết nối tới Redis và `mongoose` để kết nối tới MongoDB.
- **Tích hợp `recachegoose`:** Bằng cách gọi `recachegoose(mongoose, redis)`, chúng ta đã thiết lập việc sử dụng Redis làm nơi lưu trữ cache cho các truy vấn MongoDB.
- **Sử dụng `cache` trong Mongoose query:** Phương thức `User.find().cache(30)` sẽ lưu trữ kết quả của truy vấn vào Redis trong 30 giây, giúp giảm tải việc truy vấn lại MongoDB cho các request sau.
- **Xóa cache thủ công:** Khi cần thiết, bạn có thể gọi `recachegoose.clearCache()` để xóa tất cả cache.

### 8. Kiểm tra hoạt động

1. **Khởi chạy Redis trên cổng 6380**, MongoDB và ứng dụng Node.js của bạn.
2. Gửi request tới endpoint `/users` để kiểm tra cache hoạt động. Lần đầu tiên sẽ lấy dữ liệu từ MongoDB và lưu cache vào Redis. Những lần sau sẽ lấy từ cache trong Redis nếu trong TTL.
3. Dùng endpoint `/clear-cache` để xóa cache khi cần.

Với cách này, bạn đã có thể sử dụng `recachegoose` để cache dữ liệu từ MongoDB vào Redis, tối ưu hóa hiệu suất ứng dụng.