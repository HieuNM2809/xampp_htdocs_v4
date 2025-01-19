const knex = require('knex');

// Cấu hình kết nối
const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1', // Hoặc địa chỉ container nếu dùng Docker
    user: 'root',
    password: 'root@123',
    database: 'knex_test',
    port: 3306
  },
  pool: { min: 0, max: 7 }
});

module.exports = db;
