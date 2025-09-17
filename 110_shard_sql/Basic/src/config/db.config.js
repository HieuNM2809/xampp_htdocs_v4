module.exports = {
  shards: [
    {
      host: 'mysql-shard1',
      user: 'user',
      password: 'password',
      database: 'shard1',
      port: 3306,
      connectionLimit: 5, // Giảm số lượng kết nối tối đa
      acquireTimeout: 30000, // Thời gian timeout khi tạo kết nối mới (30 giây)
      waitForConnections: true, // Đợi nếu hết kết nối
      queueLimit: 0 // Không giới hạn số lượng connection requests trong queue
    },
    {
      host: 'mysql-shard2',
      user: 'user',
      password: 'password',
      database: 'shard2',
      port: 3306,
      connectionLimit: 5, // Giảm số lượng kết nối tối đa
      acquireTimeout: 30000, // Thời gian timeout khi tạo kết nối mới (30 giây)
      waitForConnections: true, // Đợi nếu hết kết nối
      queueLimit: 0 // Không giới hạn số lượng connection requests trong queue
    }
  ]
};
