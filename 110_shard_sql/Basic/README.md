# Ví dụ cơ bản về Sharding với Node.js và Docker

Đây là một ứng dụng mẫu minh họa cách triển khai database sharding với Node.js, Express và MySQL sử dụng Docker.

## Cấu trúc dự án

```
Basic/
├── docker/
│   ├── app/
│   │   └── Dockerfile
│   ├── mysql-shard1/
│   │   └── init.sql
│   └── mysql-shard2/
│       └── init.sql
├── src/
│   ├── config/
│   │   └── db.config.js
│   ├── routes/
│   │   ├── product.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   ├── db.service.js
│   │   ├── product.service.js
│   │   └── user.service.js
│   ├── utils/
│   │   └── shard.utils.js
│   └── index.js
├── docker-compose.yml
├── package.json
└── README.md
```

## Chiến lược Sharding

Ứng dụng này sử dụng chiến lược sharding dựa trên ID của đối tượng (user_id, product_id). Các đối tượng được phân bổ đến các shard cụ thể dựa trên hàm băm MD5 (hash) của ID đối tượng. Cách tiếp cận này đảm bảo:

1. **Phân phối đồng đều**: Dữ liệu được phân phối tương đối đều giữa các shard
2. **Tính nhất quán**: Cùng một ID luôn được định tuyến đến cùng một shard
3. **Khả năng mở rộng**: Dễ dàng thêm shard mới khi cần thiết

## Cài đặt và chạy

### Yêu cầu

- Docker và Docker Compose
- Node.js (chỉ cần để phát triển cục bộ)

### Các bước thực hiện

1. Clone repository về máy:

```bash
git clone <repository-url>
cd Basic
```

2. Khởi động các container bằng Docker Compose:

```bash
docker-compose up -d
```

3. Truy cập ứng dụng:

```
http://localhost:3000
```

## API Endpoints

### Users API

- **GET /api/users**: Lấy tất cả người dùng từ tất cả các shard
- **GET /api/users/:userId**: Lấy thông tin người dùng theo ID
- **POST /api/users**: Tạo người dùng mới
- **PUT /api/users/:userId**: Cập nhật thông tin người dùng
- **DELETE /api/users/:userId**: Xóa người dùng

### Products API

- **GET /api/products**: Lấy tất cả sản phẩm từ tất cả các shard
- **GET /api/products/:productId**: Lấy thông tin sản phẩm theo ID
- **POST /api/products**: Tạo sản phẩm mới
- **PUT /api/products/:productId**: Cập nhật thông tin sản phẩm
- **DELETE /api/products/:productId**: Xóa sản phẩm

## Ví dụ sử dụng API

### Tạo người dùng mới

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyễn Văn A","email":"nguyenvana@example.com"}'
```

### Lấy tất cả người dùng

```bash
curl http://localhost:3000/api/users
```

## Lưu ý về Sharding trong ứng dụng

1. **Định tuyến dữ liệu**: Dữ liệu được lưu trữ ở các shard khác nhau dựa trên ID của đối tượng
2. **Truy vấn phân tán**: Để lấy tất cả dữ liệu, ứng dụng thực hiện truy vấn trên tất cả các shard và tổng hợp kết quả
3. **Nhất quán dữ liệu**: Mỗi đối tượng luôn được lưu trên cùng một shard
4. **Không có giao dịch phân tán**: Ứng dụng mẫu này không hỗ trợ giao dịch phân tán giữa các shard

## Mở rộng ứng dụng

Để mở rộng ứng dụng này trong thực tế, bạn có thể cân nhắc các cải tiến sau:

1. Thêm proxy SQL để điều hướng truy vấn tự động
2. Triển khai cơ chế sao chép (replication) cho các shard để đảm bảo tính sẵn sàng cao
3. Thêm cơ chế cache để giảm tải cho database
4. Triển khai chiến lược resharding khi cần thiết
