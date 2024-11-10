const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Tạo thư mục để lưu trữ hình ảnh nếu chưa tồn tại
const outputDir = 'optimized-images';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Route phục vụ file HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route để upload nhiều hình ảnh
app.post('/upload', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files) {
            return res.status(400).send('Không có file nào được tải lên');
        }

        // Xử lý chuyển đổi từng ảnh
        for (const file of req.files) {
            const outputFilePath = path.join(outputDir, `${path.parse(file.originalname).name}.webp`);
            await sharp(file.path)
                .resize({
                    width: 800, // Resize để tiết kiệm dung lượng
                    fit: sharp.fit.inside, // Duy trì tỷ lệ khung hình
                    withoutEnlargement: true // Không phóng to ảnh nhỏ hơn
                })
                .webp({
                    quality: 80, // Chất lượng cao nhưng vẫn giữ kích thước nhỏ
                    effort: 6 // Tăng mức độ tối ưu hóa (0-6, 6 là cao nhất)
                })
                .withMetadata(false) // Loại bỏ metadata không cần thiết
                .toFile(outputFilePath);

            // Xóa file gốc sau khi chuyển đổi
            fs.unlinkSync(file.path);
        }

        res.send('Đã upload và chuyển đổi hình ảnh thành công');
    } catch (error) {
        console.error('Lỗi xử lý ảnh:', error);
        res.status(500).send('Đã xảy ra lỗi trong quá trình xử lý ảnh');
    }
});

// Khởi động server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

