const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Phục vụ file tĩnh từ thư mục public

// Route render giao diện
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Chat
app.post('/chat', async (req, res) => {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: req.body.message }
            ],
            model: "deepseek-chat",
        });

        res.json({
            reply: completion.choices[0].message.content
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Lỗi khi xử lý yêu cầu' });
    }
});

app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});