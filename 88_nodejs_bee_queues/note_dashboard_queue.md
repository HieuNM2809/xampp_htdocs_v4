Để theo dõi các hàng đợi trong ứng dụng sử dụng `bee-queue`, bạn có thể sử dụng một giao diện quản lý như **Arena** hoặc **Bee-Queue Dashboard**. Dưới đây là hướng dẫn cài đặt và sử dụng **Arena**, một công cụ phổ biến để quản lý và theo dõi các hàng đợi dựa trên Redis.

### 1. Cài đặt Arena

Trước hết, bạn cần cài đặt `arena`:

```bash
npm install --save arena bull-arena express
```

### 2. Cấu hình Arena

Sau khi cài đặt, bạn cần cấu hình `Arena` để kết nối với các hàng đợi `bee-queue` trong ứng dụng của bạn. Tạo một file mới, ví dụ `arena.js`:

```javascript
const Arena = require('bull-arena');
const Bee = require('bee-queue');
const express = require('express');

const app = express();

const arena = Arena(
  {
    Bee,
    queues: [
      {
        name: "example", // Tên hàng đợi
        hostId: "Bee Queue", // Tên hiển thị trên giao diện
        type: "bee", // Loại hàng đợi là bee-queue
        redis: {
          host: "localhost", // Địa chỉ Redis
          port: 6380, // Cổng Redis
          // password: "your_redis_password", // Mật khẩu Redis nếu cần
        },
      },
    ],
  },
  {
    basePath: "/arena", // Đường dẫn để truy cập giao diện Arena
    disableListen: true, // Arena sẽ không tự tạo server, bạn sẽ thêm vào app express hiện tại
  }
);

app.use('/', arena);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Arena is running on http://localhost:${PORT}/arena`);
});
```

### 3. Khởi động Arena

Chạy file `arena.js`:

```bash
node arena.js
```

Nếu cấu hình đúng, bạn sẽ thấy thông báo:

```bash
Arena is running on http://localhost:3001/arena
```

### 4. Truy cập Arena

Mở trình duyệt và truy cập `http://localhost:3001/arena`. Bạn sẽ thấy giao diện Arena với danh sách các hàng đợi, các công việc đang được xử lý, những công việc đã hoàn thành, và những công việc gặp lỗi.

### 5. Cấu hình nhiều hàng đợi

Nếu bạn có nhiều hàng đợi, bạn có thể thêm chúng vào cấu hình của Arena:

```javascript
queues: [
  {
    name: "example",
    hostId: "Bee Queue",
    type: "bee",
    redis: {
      host: "localhost",
      port: 6380,
    },
  },
  {
    name: "anotherQueue",
    hostId: "Bee Queue",
    type: "bee",
    redis: {
      host: "localhost",
      port: 6380,
    },
  },
],
```

### 6. Sử dụng Arena trong ứng dụng hiện có

Nếu bạn đã có một ứng dụng Express, bạn có thể tích hợp Arena vào ứng dụng đó:

```javascript
const express = require('express');
const app = express();
const arena = require('./arena'); // Đường dẫn đến file cấu hình arena.js

app.use('/', arena);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Arena is available on http://localhost:${PORT}/arena`);
});
```

### 7. Theo dõi và quản lý

Với Arena, bạn có thể:
- Theo dõi số lượng công việc trong các hàng đợi.
- Kiểm tra trạng thái công việc (đang xử lý, đã hoàn thành, lỗi).
- Xem chi tiết về từng công việc, bao gồm dữ liệu đầu vào, thời gian xử lý, kết quả, và lỗi nếu có.
- Xóa công việc khỏi hàng đợi nếu cần.

Arena là một công cụ mạnh mẽ và dễ sử dụng để quản lý hàng đợi trong các ứng dụng sử dụng `bee-queue`.