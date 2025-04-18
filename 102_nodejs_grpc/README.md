# gRPC Node.js Todo App

Đây là một ứng dụng mẫu về gRPC trong Node.js, triển khai một dịch vụ quản lý công việc (Todo service) đơn giản với các thao tác CRUD (Create, Read, Update, Delete).

## Cấu trúc dự án

```
.
├── proto/
│   └── todo.proto      # Định nghĩa Protocol Buffers
├── server/
│   └── index.js        # Server gRPC
├── client/
│   └── index.js        # Client gRPC
└── package.json
```

## Cài đặt

1. Cài đặt các gói phụ thuộc:

```bash
npm install
```

2. Cài đặt thêm thư viện uuid:

```bash
npm install uuid
```

## Các khái niệm gRPC

1. **Protocol Buffers**: Định nghĩa cấu trúc dữ liệu và dịch vụ trong tệp `todo.proto`
2. **Service**: Định nghĩa các phương thức RPC có thể được gọi từ xa
3. **Messages**: Định nghĩa cấu trúc dữ liệu để trao đổi giữa client và server

## Chạy ứng dụng

1. Khởi động server:

```bash
node server/index.js
```

2. Trong một terminal khác, khởi động client:

```bash
node client/index.js
```

3. Sử dụng giao diện dòng lệnh để:
   - Tạo công việc mới
   - Xem danh sách công việc
   - Xem chi tiết công việc
   - Cập nhật công việc
   - Xóa công việc

## Giải thích mã nguồn

### Protocol Buffers (todo.proto)

Tệp này định nghĩa:
- Service `TodoService` với 5 phương thức RPC
- Message types: `TodoItem`, `TodoId`, `TodoList`, `Empty`

### Server (server/index.js)

- Tải và phân tích tệp proto
- Triển khai các phương thức của service
- Khởi động gRPC server trên cổng 50051

### Client (client/index.js)

- Kết nối đến gRPC server
- Cung cấp giao diện dòng lệnh để tương tác với service
- Gọi các phương thức RPC từ xa

## Ưu điểm của gRPC

1. **Hiệu suất cao**: Sử dụng Protocol Buffers giúp serialize dữ liệu nhanh hơn so với JSON
2. **API chặt chẽ**: Định nghĩa rõ ràng về cấu trúc dữ liệu và phương thức trong tệp proto
3. **Đa ngôn ngữ**: Có thể tạo client và server bằng nhiều ngôn ngữ khác nhau
4. **Streaming**: Hỗ trợ streaming hai chiều (ví dụ này không sử dụng tính năng này)
5. **Tài liệu tự động**: Tệp proto đóng vai trò như định nghĩa API 