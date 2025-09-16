const express = require('express');
const dbService = require('./services/db.service');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');

const app = express();
app.use(express.json());

// Khởi tạo kết nối đến các shard
dbService.initializeConnections();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Route mặc định
app.get('/', (req, res) => {
  res.json({
    message: 'Ứng dụng sharding cơ bản với Docker và Node.js',
    endpoints: [
      '/api/users - Quản lý người dùng',
      '/api/products - Quản lý sản phẩm'
    ]
  });
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Đã xảy ra lỗi',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
