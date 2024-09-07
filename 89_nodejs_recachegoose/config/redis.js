const Redis = require('ioredis');

// Kết nối đến Redis trên cổng 6380
const configRedis = {
    port: 6380,  // Cổng Redis
    host: '127.0.0.1', // Địa chỉ Redis
    db: 0,
}
const redis = new Redis(configRedis);
redis.on('connect', () => {
    console.log('Connected to Redis successfully!');
});

redis.on('error', (err) => {
    console.error('Failed to connect to Redis:', err);
});
module.exports = {
    configRedis, redis
};
