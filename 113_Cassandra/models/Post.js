const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Post {
    constructor() {
        this.tableName = 'posts';
    }

    // Tạo post mới
    async create(postData) {
        const client = database.getClient();
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO ${this.tableName} (id, user_id, title, content, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            postData.user_id,
            postData.title,
            postData.content,
            postData.tags || [],
            now,
            now
        ];

        try {
            await client.execute(query, params, { prepare: true });
            return this.findById(id);
        } catch (error) {
            console.error('Lỗi khi tạo post:', error);
            throw error;
        }
    }

    // Tìm post theo ID
    async findById(id) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;

        try {
            const result = await client.execute(query, [id], { prepare: true });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi tìm post theo ID:', error);
            throw error;
        }
    }

    // Tìm posts theo user_id
    async findByUserId(userId, limit = 50) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE user_id = ? LIMIT ? ALLOW FILTERING`;

        try {
            const result = await client.execute(query, [userId, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi tìm posts theo user_id:', error);
            throw error;
        }
    }

    // Lấy tất cả posts
    async findAll(limit = 100) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} LIMIT ?`;

        try {
            const result = await client.execute(query, [limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách posts:', error);
            throw error;
        }
    }

    // Tìm posts theo tag
    async findByTag(tag, limit = 50) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE tags CONTAINS ? LIMIT ? ALLOW FILTERING`;

        try {
            const result = await client.execute(query, [tag, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi tìm posts theo tag:', error);
            throw error;
        }
    }

    // Cập nhật post
    async updateById(id, updateData) {
        const client = database.getClient();
        const now = new Date();

        // Tạo dynamic SET clause
        const setFields = [];
        const params = [];

        if (updateData.title !== undefined) {
            setFields.push('title = ?');
            params.push(updateData.title);
        }
        if (updateData.content !== undefined) {
            setFields.push('content = ?');
            params.push(updateData.content);
        }
        if (updateData.tags !== undefined) {
            setFields.push('tags = ?');
            params.push(updateData.tags);
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
            console.error('Lỗi khi cập nhật post:', error);
            throw error;
        }
    }

    // Xóa post theo ID
    async deleteById(id) {
        const client = database.getClient();
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;

        try {
            await client.execute(query, [id], { prepare: true });
            return true;
        } catch (error) {
            console.error('Lỗi khi xóa post:', error);
            throw error;
        }
    }

    // Thêm tag vào post
    async addTag(postId, tag) {
        const client = database.getClient();
        const query = `UPDATE ${this.tableName} SET tags = tags + ? WHERE id = ?`;

        try {
            await client.execute(query, [[tag], postId], { prepare: true });
            return this.findById(postId);
        } catch (error) {
            console.error('Lỗi khi thêm tag:', error);
            throw error;
        }
    }

    // Xóa tag khỏi post
    async removeTag(postId, tag) {
        const client = database.getClient();
        const query = `UPDATE ${this.tableName} SET tags = tags - ? WHERE id = ?`;

        try {
            await client.execute(query, [[tag], postId], { prepare: true });
            return this.findById(postId);
        } catch (error) {
            console.error('Lỗi khi xóa tag:', error);
            throw error;
        }
    }
}

module.exports = new Post();

