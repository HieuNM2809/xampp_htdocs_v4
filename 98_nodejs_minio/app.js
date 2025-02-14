const express = require('express');
const multer = require('multer');
const fs = require('fs');
const minioClient = require('./minioClient');

const app = express();

// Cấu hình multer để lưu file tạm thời trong thư mục "uploads"
const upload = multer({ dest: 'uploads/' });
const bucketName = 'mybucket';

// Endpoint upload file
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Không có file được upload.');
  }

  const filePath = req.file.path;         // Đường dẫn file tạm thời
  const objectName = req.file.originalname; // Sử dụng tên file gốc làm tên đối tượng
  const metaData = { 'Content-Type': req.file.mimetype };

  // Upload file lên MinIO
  minioClient.fPutObject(bucketName, objectName, filePath, metaData, (err, etag) => {
    // Xóa file tạm thời sau khi upload
    fs.unlink(filePath, () => {});

    if (err) {
      console.error('Lỗi upload file:', err);
      return res.status(500).send('Lỗi khi upload file.');
    }
    res.send(`File '${objectName}' upload thành công với ETag: ${etag}`);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});