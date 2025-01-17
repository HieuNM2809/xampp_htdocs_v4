const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');

const app = express();

// Cấu hình thư mục lưu ảnh tải lên
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Đổi tên file
    },
});
const upload = multer({storage});

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (CSS, Ảnh)
app.use(express.static(path.join(__dirname, 'public')));

// Giao diện chính
app.get('/', (req, res) => {
    res.render('index', {text: null, error: null});
});

// Xử lý tải lên ảnh và OCR
app.post('/upload', upload.single('image'), (req, res) => {
    const imagePath = req.file.path;

    Tesseract.recognize(
        imagePath,
        'vie', // Ngôn ngữ OCR (có thể đổi sang 'vie' nếu cần tiếng Việt, eng)
        {
            logger: info => console.log(info), // Theo dõi tiến trình
        }
    )
        .then(({data: {text}}) => {
            res.render('index', {text, error: null});
        })
        .catch(error => {
            res.render('index', {text: null, error: 'OCR failed: ' + error.message});
        });
});

// Chạy server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
