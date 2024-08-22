const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SECRET_KEY = 'your_secret_key';

// Middleware để xác thực JWT
io.use((socket, next) => {
    const token = socket.handshake.headers.access_token;
    console.log('Token received:', token);
    if (token) {
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                console.error('JWT verification failed:', err);
                return next(new Error('Authentication error'));
            }
            socket.user = decoded;
            console.log('socket.user', socket.user)
            next();
        });
    } else {
        console.error('No token provided');
        next(new Error('Authentication error'));
    }
});


io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}, Socket ID: ${socket.id}`);

    // Tham gia vào một room
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`${socket.user.username} joined room: ${room}`);
        io.to(room).emit('message', `${socket.user.username} has joined the room ${room}`);
    });

    // Gửi tin nhắn đến một room
    socket.on('message', (data) => {
        const { room, message } = data;
        console.log(`Message from ${socket.user.username} in room ${room}: ${message}`);
        io.to(room).emit('message', `${socket.user.username}: ${message}`);
    });

    // Ngắt kết nối
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username}, Socket ID: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log('Socket.io server is running on port 3000');
});
