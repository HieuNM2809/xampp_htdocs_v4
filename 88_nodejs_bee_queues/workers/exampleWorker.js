const Queue = require('bee-queue');
const {redisConfig} = require('../config/redis');
const exampleJob = require('../jobs/exampleJob');

const exampleQueue = new Queue('example', {
    redis: redisConfig,
    isWorker: true,  // Worker xử lý công việc
    removeOnSuccess: false,  // Xóa job khỏi hàng đợi khi thành công
});

exampleQueue.process(2, async (job, done) => {
    try {
        const result = await exampleJob(job);

        console.log(`Done job ${job.id}`);
        done(null, result);
    } catch (error) {
        done(error);
    }
});
