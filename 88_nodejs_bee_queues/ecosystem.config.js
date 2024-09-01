module.exports = {
    apps: [
        {
            name: 'server',
            script: './server.js',
            instances: 1,
            exec_mode: 'cluster',
            watch: true,
            watch_delay: 1000, // Thay đổi này có thể giúp PM2 phát hiện thay đổi nhanh hơn
            ignore_watch: ['node_modules'] // Đảm bảo không theo dõi thư mục không cần thiết
        },
        {
            name: 'exampleWorker',
            script: './workers/exampleWorker.js',
            instances: 1,
            exec_mode: 'fork',
            watch: true,
            watch_delay: 1000,
            ignore_watch: ['node_modules']
        }
    ]
};
