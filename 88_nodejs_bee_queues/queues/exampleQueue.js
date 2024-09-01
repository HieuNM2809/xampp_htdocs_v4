const Queue = require('bee-queue');
const {redisConfig} = require('../config/redis');

const exampleQueue = new Queue('example', {
    redis: redisConfig,
    isWorker: false,  // Đây là hàng đợi chỉ tạo công việc, không xử lý
    removeOnSuccess: true,  // Xóa job khỏi hàng đợi khi thành công
});

module.exports = exampleQueue;
