const mongoose = require('mongoose');

async function connectMongo() {
    try {
        await mongoose.connect('mongodb://root:123456@localhost:27018/recachegoose', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            authSource: 'admin',
        });
        console.log('MongoDB connected');
        // Bật debug mode để xem các truy vấn
        mongoose.set('debug', true);

    } catch (err) {
        console.error('MongoDB connection error', err);
    }
}

module.exports = connectMongo;
