const cassandra = require('cassandra-driver');
require('dotenv').config();

async function initDatabase() {
    let client;

    try {
        console.log('🚀 Bắt đầu khởi tạo database...');

        // Kết nối không cần keyspace để tạo keyspace mới
        client = new cassandra.Client({
            contactPoints: process.env.CASSANDRA_HOSTS?.split(',') || ['127.0.0.1'],
            localDataCenter: 'datacenter1'
        });

        await client.connect();
        console.log('✅ Đã kết nối với Cassandra cluster');

        const keyspace = process.env.CASSANDRA_KEYSPACE || 'nodejs_example';

        // Tạo keyspace
        const createKeyspaceQuery = `
            CREATE KEYSPACE IF NOT EXISTS ${keyspace}
            WITH REPLICATION = {
                'class': 'SimpleStrategy',
                'replication_factor': 1
            }
        `;

        await client.execute(createKeyspaceQuery);
        console.log(`✅ Đã tạo keyspace: ${keyspace}`);

        // Sử dụng keyspace
        await client.execute(`USE ${keyspace}`);

        // Tạo bảng users
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email TEXT,
                name TEXT,
                age INT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        `;

        await client.execute(createUsersTable);
        console.log('✅ Đã tạo bảng users');

        // Tạo bảng posts
        const createPostsTable = `
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY,
                user_id UUID,
                title TEXT,
                content TEXT,
                tags SET<TEXT>,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        `;

        await client.execute(createPostsTable);
        console.log('✅ Đã tạo bảng posts');

        // Tạo index cho email
        const createEmailIndex = `
            CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)
        `;

        await client.execute(createEmailIndex);
        console.log('✅ Đã tạo index cho email');

        console.log('🎉 Khởi tạo database hoàn thành!');

    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo database:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.shutdown();
        }
    }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
    initDatabase();
}

module.exports = initDatabase;

