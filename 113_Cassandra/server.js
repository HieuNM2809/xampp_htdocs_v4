const express = require('express');
const cors = require('cors');
const database = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server đang hoạt động',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Cassandra + Node.js API Server',
        version: '1.0.0',
        endpoints: {
            users: '/api/users',
            posts: '/api/posts',
            health: '/health'
        },
        documentation: 'Xem README.md để biết thêm chi tiết'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Lỗi server:', err);
    res.status(500).json({
        error: 'Lỗi server nội bộ',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Có lỗi xảy ra'
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Không tìm thấy endpoint',
        message: `Đường dẫn ${req.originalUrl} không tồn tại`
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Đang tắt server...');
    try {
        await database.disconnect();
        console.log('👋 Server đã tắt hoàn toàn');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi tắt server:', error);
        process.exit(1);
    }
});

// Khởi động server
async function startServer() {
    try {
        // Kết nối database
        console.log('🔌 Đang kết nối với Cassandra...');
        await database.connect();

        // Khởi động server
        app.listen(PORT, () => {
            console.log(`\n🎉 Server đã khởi động thành công!`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
            console.log(`📖 API Documentation: http://localhost:${PORT}`);
            console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}\n`);
        });

    } catch (error) {
        console.error('❌ Lỗi khi khởi động server:', error);
        process.exit(1);
    }
}

// Chỉ khởi động server nếu file được chạy trực tiếp
if (require.main === module) {
    startServer();
}

module.exports = app;

