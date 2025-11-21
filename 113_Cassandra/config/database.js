const cassandra = require('cassandra-driver');
require('dotenv').config();

class CassandraDB {
    constructor() {
        this.client = null;
        this.keyspace = process.env.CASSANDRA_KEYSPACE || 'nodejs_example';
    }

    async connect() {
        try {
            // Tạo client để kết nối với Cassandra
            this.client = new cassandra.Client({
                contactPoints: process.env.CASSANDRA_HOSTS?.split(',') || ['127.0.0.1'],
                localDataCenter: 'datacenter1',
                credentials: process.env.CASSANDRA_USERNAME && process.env.CASSANDRA_PASSWORD
                    ? {
                        username: process.env.CASSANDRA_USERNAME,
                        password: process.env.CASSANDRA_PASSWORD
                    }
                    : undefined,
                keyspace: this.keyspace
            });

            await this.client.connect();
            console.log('✅ Đã kết nối thành công với Cassandra');
            console.log(`📊 Đang sử dụng keyspace: ${this.keyspace}`);

            return this.client;
        } catch (error) {
            console.error('❌ Lỗi khi kết nối với Cassandra:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.shutdown();
            console.log('🔐 Đã ngắt kết nối với Cassandra');
        }
    }

    getClient() {
        if (!this.client) {
            throw new Error('Chưa kết nối với Cassandra. Hãy gọi connect() trước.');
        }
        return this.client;
    }
}

// Tạo instance singleton
const database = new CassandraDB();

module.exports = database;
