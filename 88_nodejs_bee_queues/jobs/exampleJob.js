module.exports = async function exampleJob(job) {
    // Đây là nơi bạn thực hiện các tác vụ khi job này chạy
    console.log(`Processing job ${job.id}`);

    // Giả sử công việc này cần 2 giây để hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return `Job ${job.id} completed!`;
};
