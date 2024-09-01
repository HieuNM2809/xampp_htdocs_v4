const Arena = require('bull-arena');
const Bee = require('bee-queue');
const express = require('express');
const {redisConfig} = require('../config/redis');

const app = express();

const arena = Arena(
    {
        Bee,
        queues: [
            {
                name: "example", // Tên hàng đợi
                hostId: "Bee Queue", // Tên hiển thị trên giao diện
                type: "bee", // Loại hàng đợi là bee-queue
                redis: redisConfig,
            },
        ],
    },
    {
        basePath: "/arena", // Đường dẫn để truy cập giao diện Arena
        disableListen: true, // Arena sẽ không tự tạo server, bạn sẽ thêm vào app express hiện tại
    }
);

module.exports = arena;


// app.use('/', arena);
//
// const PORT = 3001;
// app.listen(PORT, () => {
//     console.log(`Arena is running on http://localhost:${PORT}/arena`);
// });