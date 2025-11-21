const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
    constructor() {
        this.tableName = 'users';
    }

    // Tạo user mới
    async create(userData) {
        const client = database.getClient();
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO ${this.tableName} (id, email, name, age, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            userData.email,
            userData.name,
            userData.age || null,
            now,
            now
        ];

        try {
            await client.execute(query, params, { prepare: true });
            return this.findById(id);
        } catch (error) {
            console.error('Lỗi khi tạo user:', error);
            throw error;
        }
    }

    // Tìm user theo ID
    async findById(id) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;

        try {
            const result = await client.execute(query, [id], { prepare: true });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi tìm user theo ID:', error);
            throw error;
        }
    }

    // Tìm user theo email
    async findByEmail(email) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE email = ? ALLOW FILTERING`;

        try {
            const result = await client.execute(query, [email], { prepare: true });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi tìm user theo email:', error);
            throw error;
        }
    }

    // Lấy tất cả users
    async findAll(limit = 100) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} LIMIT ?`;

        try {
            const result = await client.execute(query, [limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách users:', error);
            throw error;
        }
    }

    // Cập nhật user
    async updateById(id, updateData) {
        const client = database.getClient();
        const now = new Date();

        // Tạo dynamic SET clause
        const setFields = [];
        const params = [];

        if (updateData.email !== undefined) {
            setFields.push('email = ?');
            params.push(updateData.email);
        }
        if (updateData.name !== undefined) {
            setFields.push('name = ?');
            params.push(updateData.name);
        }
        if (updateData.age !== undefined) {
            setFields.push('age = ?');
            params.push(updateData.age);
        }

        setFields.push('updated_at = ?');
        params.push(now);
        params.push(id); // WHERE condition

        const query = `
            UPDATE ${this.tableName}
            SET ${setFields.join(', ')}
            WHERE id = ?
        `;

        try {
            await client.execute(query, params, { prepare: true });
            return this.findById(id);
        } catch (error) {
            console.error('Lỗi khi cập nhật user:', error);
            throw error;
        }
    }

    // Xóa user theo ID
    async deleteById(id) {
        const client = database.getClient();
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;

        try {
            await client.execute(query, [id], { prepare: true });
            return true;
        } catch (error) {
            console.error('Lỗi khi xóa user:', error);
            throw error;
        }
    }
}

module.exports = new User();

