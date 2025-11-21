/**
 * Ví dụ sử dụng API với axios
 * Chạy: node examples/api-examples.js
 */

const axios = require('axios');

// Cấu hình base URL
const API_BASE_URL = 'http://localhost:3000/api';
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Thêm response interceptor để xử lý lỗi
api.interceptors.response.use(
    response => response,
    error => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
    }
);

class APIExample {
    async run() {
        console.log('🚀 Bắt đầu demo API...\n');

        try {
            // 1. Tạo user mới
            console.log('1. Tạo user mới...');
            const newUser = await this.createUser({
                email: 'demo@example.com',
                name: 'Demo User',
                age: 25
            });
            console.log('✅ User created:', newUser.data.id);

            // 2. Lấy thông tin user
            console.log('\n2. Lấy thông tin user...');
            const user = await this.getUser(newUser.data.id);
            console.log('✅ User info:', user.data.name);

            // 3. Tạo post cho user
            console.log('\n3. Tạo post mới...');
            const newPost = await this.createPost({
                user_id: newUser.data.id,
                title: 'My First Cassandra Post',
                content: 'This is a demo post using Cassandra and Node.js!',
                tags: ['demo', 'cassandra', 'nodejs']
            });
            console.log('✅ Post created:', newPost.data.id);

            // 4. Lấy posts của user
            console.log('\n4. Lấy posts của user...');
            const userPosts = await this.getUserPosts(newUser.data.id);
            console.log('✅ User posts count:', userPosts.data.length);

            // 5. Tìm posts theo tag
            console.log('\n5. Tìm posts theo tag "cassandra"...');
            const tagPosts = await this.getPostsByTag('cassandra');
            console.log('✅ Posts with tag "cassandra":', tagPosts.data.length);

            // 6. Thêm tag vào post
            console.log('\n6. Thêm tag "example" vào post...');
            await this.addTagToPost(newPost.data.id, 'example');
            console.log('✅ Tag added successfully');

            // 7. Cập nhật user
            console.log('\n7. Cập nhật thông tin user...');
            const updatedUser = await this.updateUser(newUser.data.id, {
                name: 'Updated Demo User',
                age: 26
            });
            console.log('✅ User updated:', updatedUser.data.name);

            // 8. Lấy tất cả users
            console.log('\n8. Lấy danh sách users...');
            const allUsers = await this.getAllUsers();
            console.log('✅ Total users:', allUsers.data.length);

            // 9. Cleanup - xóa dữ liệu demo
            console.log('\n9. Cleanup - xóa dữ liệu demo...');
            await this.deletePost(newPost.data.id);
            console.log('✅ Post deleted');

            await this.deleteUser(newUser.data.id);
            console.log('✅ User deleted');

            console.log('\n🎉 Demo hoàn thành!');

        } catch (error) {
            console.error('\n❌ Demo failed:', error.message);
        }
    }

    // User methods
    async createUser(userData) {
        const response = await api.post('/users', userData);
        return response.data;
    }

    async getUser(userId) {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    }

    async getAllUsers(limit = 100) {
        const response = await api.get(`/users?limit=${limit}`);
        return response.data;
    }

    async updateUser(userId, updateData) {
        const response = await api.put(`/users/${userId}`, updateData);
        return response.data;
    }

    async deleteUser(userId) {
        const response = await api.delete(`/users/${userId}`);
        return response.data;
    }

    async findUserByEmail(email) {
        const response = await api.get(`/users/email/${email}`);
        return response.data;
    }

    // Post methods
    async createPost(postData) {
        const response = await api.post('/posts', postData);
        return response.data;
    }

    async getPost(postId) {
        const response = await api.get(`/posts/${postId}`);
        return response.data;
    }

    async getAllPosts(limit = 100) {
        const response = await api.get(`/posts?limit=${limit}`);
        return response.data;
    }

    async getUserPosts(userId, limit = 50) {
        const response = await api.get(`/posts/user/${userId}?limit=${limit}`);
        return response.data;
    }

    async getPostsByTag(tag, limit = 50) {
        const response = await api.get(`/posts/tag/${tag}?limit=${limit}`);
        return response.data;
    }

    async updatePost(postId, updateData) {
        const response = await api.put(`/posts/${postId}`, updateData);
        return response.data;
    }

    async deletePost(postId) {
        const response = await api.delete(`/posts/${postId}`);
        return response.data;
    }

    async addTagToPost(postId, tag) {
        const response = await api.post(`/posts/${postId}/tags`, { tag });
        return response.data;
    }

    async removeTagFromPost(postId, tag) {
        const response = await api.delete(`/posts/${postId}/tags/${tag}`);
        return response.data;
    }

    // Health check
    async healthCheck() {
        const response = await api.get('/health', {
            baseURL: 'http://localhost:3000'
        });
        return response.data;
    }
}

// Chạy demo nếu file được gọi trực tiếp
if (require.main === module) {
    const demo = new APIExample();

    // Kiểm tra server có chạy không
    demo.healthCheck()
        .then(() => {
            console.log('🏥 Server is running, starting demo...\n');
            return demo.run();
        })
        .catch(() => {
            console.error('❌ Server is not running. Please start the server first:');
            console.error('   npm run dev');
            console.error('   or');
            console.error('   npm start');
        });
}

module.exports = APIExample;

