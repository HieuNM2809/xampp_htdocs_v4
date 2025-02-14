const Minio = require('minio');

// Khởi tạo MinIO client với cấu hình đã thiết lập
const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',      // Địa chỉ MinIO server (localhost khi chạy trên máy)
  port: 9000,                 // Cổng của MinIO server
  useSSL: false,              // Sử dụng SSL hay không (ở đây là false)
  accessKey: 'TMOKy6DuTcHu9YlywL9l',         // Access Key của MinIO
  secretKey: 'jybOJ2RCp5Wr1EbyGkyJTWbFWAfZLGnp73C24Z0L'       // Secret Key của MinIO
});

module.exports = minioClient;