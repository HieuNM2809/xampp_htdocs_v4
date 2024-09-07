const express = require('express');
const mongoose = require('mongoose');
const recachegoose = require('recachegoose');
const {configRedis} = require('./config/redis');
const connectMongo = require('./config/mongo');
const User = require('./models/user');

const app = express();
const PORT = 3000;

// Kết nối MongoDB
connectMongo();

// Cấu hình recachegoose với Redis
recachegoose(mongoose, {
    engine: 'redis',
    ...configRedis
});

// Route để lấy danh sách user từ cache
app.get('/users', async (req, res) => {
    try {
        // Sử dụng cache với TTL là 30 giây
        const users = await User.find().cache(300, 'user_all');
        res.json(users);
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

app.get('/users/email/:email', async (req, res) => {
    const userEmail = req.params.email;
    try {
        // Sử dụng cache theo email với TTL là 300 giây
        const user = await User.findOne({ email: userEmail }).cache(300, `user_email_${userEmail}`);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Xóa cache thủ công khi cần
app.get('/clear-cache', async (req, res) => {
    try {
        await recachegoose.clearCache('user_all');
        res.json({message: 'Cache cleared'});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
