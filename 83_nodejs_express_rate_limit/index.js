const express = require('express');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
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
    max: 10, // Giới hạn mỗi IP chỉ được thực hiện 100 request trong windowMs
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút',
    keyGenerator: (req) => req.ip, // Tạo khóa dựa trên IP của request
});

// Áp dụng rate limiter cho tất cả các request
// app.use(limiter);

app.get('/', limiter, (req, res) => {
    res.send('Xin chào!');
});
app.get('/test', (req, res) => {
    res.send('Xin chào! 2');
});

app.listen(3000, () => {
    console.log('Server đang chạy trên port 3000');
});