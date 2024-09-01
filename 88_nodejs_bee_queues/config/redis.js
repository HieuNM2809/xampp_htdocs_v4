const Redis = require('ioredis');

const redisConfig = {
    host: 'localhost',
    port: 6380,
    // password: 'your_redis_password',  // nếu cần
    // db: 0,  // chọn database Redis phù hợp
};

const redisClient = new Redis(redisConfig);

// Kiểm tra kết nối
redisClient.on('connect', () => {
    console.log('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
    console.error('Error connecting to Redis:', err);
});

module.exports = {
    redisClient,
    redisConfig
};
