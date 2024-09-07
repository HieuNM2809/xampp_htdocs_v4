const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Khởi tạo ứng dụng express
const app = express();

// Cấu hình lưu trữ multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        console.log('destination')

        // Xác định thư mục lưu trữ dựa trên loại file
        let uploadPath = './uploads/';
        if (file.mimetype.startsWith('image/')) {
            uploadPath += 'images/';
        } else if (file.mimetype.startsWith('application/')) {
            uploadPath += 'documents/';
        } else {
            return cb(new Error('Invalid file type'), false);
        }

        // Tạo thư mục nếu chưa tồn tại
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {

        console.log('filename', file.originalname)

        // Tạo tên file duy nhất
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Xác thực và lọc file
const fileFilter = (req, file, cb) => {
    // Cho phép loại file: hình ảnh và tài liệu
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

// Cấu hình multer với các tùy chọn
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // Giới hạn kích thước file là 2MB
    }
});

// Route để upload nhiều file
app.post('/uploadMultiple', upload.array('files', 5), (req, res) => {
    try {
        // Danh sách các file đã được upload
        const fileInfos = req.files.map(file => ({
            filename: file.filename,
            path: file.path,
            size: file.size
        }));

        console.log('uploadMultiple')

        res.status(200).json({
            message: 'Files uploaded successfully',
            files: fileInfos
        });
    } catch (err) {
        res.status(400).json({
            message: 'Error uploading files',
            error: err.message
        });
    }
});

// Route tải file lên từ giao diện đơn giản
app.get('/', (req, res) => {
    res.send(`
        <form action="/uploadMultiple" method="post" enctype="multipart/form-data">
            <input type="file" name="files" multiple />
            <button type="submit">Upload Files</button>
        </form>
    `);
});

// Khởi động server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});