Chắc chắn rồi! Để cung cấp một ví dụ thật chi tiết và nâng cao về việc sử dụng `multer`, tôi sẽ đưa ra một kịch bản phức tạp hơn, bao gồm các yếu tố như:

- Upload nhiều file với các loại và kích thước khác nhau.
- Xác thực và lọc file dựa trên loại và kích thước.
- Tải lên file vào các thư mục khác nhau tùy thuộc vào loại file.
- Xử lý lỗi và gửi phản hồi chi tiết.

### 1. Cài đặt

Nếu chưa cài đặt, hãy thêm các package cần thiết vào dự án của bạn:

```bash
npm install express multer
```

### 2. Cấu trúc dự án

```
- project/
  - uploads/
    - images/
    - documents/
  - app.js
  - package.json
```

### 3. Tạo file `app.js`

```js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Khởi tạo ứng dụng express
const app = express();

// Cấu hình lưu trữ multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
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
```

### 4. Giải thích

- **Cấu hình lưu trữ (`storage`)**:
    - **`destination`**: Dựa trên loại MIME của file (`file.mimetype`), chúng ta quyết định lưu vào thư mục nào. Nếu là hình ảnh, lưu vào thư mục `images`, nếu là tài liệu, lưu vào thư mục `documents`. Nếu không phải là loại file hợp lệ, trả về lỗi.
    - **`filename`**: Tạo tên file duy nhất để tránh trùng lặp bằng cách sử dụng thời gian hiện tại và một số ngẫu nhiên.

- **Xác thực và lọc file (`fileFilter`)**:
    - Chỉ cho phép một số loại file cụ thể (hình ảnh và tài liệu). Nếu loại file không hợp lệ, từ chối file và gửi lỗi.

- **Giới hạn kích thước file**:
    - Giới hạn kích thước file tối đa là 2MB.

- **Route `/uploadMultiple`**:
    - Xử lý upload nhiều file cùng lúc với `upload.array('files', 5)`, cho phép tối đa 5 file.

- **Giao diện đơn giản**:
    - Một form HTML để chọn và upload nhiều file.

### 5. Xử lý lỗi và phản hồi

- **Xử lý lỗi**: Nếu có lỗi trong quá trình upload (ví dụ: loại file không hợp lệ hoặc vượt quá kích thước), trả về phản hồi lỗi chi tiết.

- **Phản hồi**: Sau khi upload thành công, gửi phản hồi với thông tin về các file đã upload.

### 6. Kết luận

Ví dụ trên cung cấp cái nhìn sâu hơn về cách sử dụng `multer` để xử lý các yêu cầu upload file phức tạp trong ứng dụng Node.js. Bạn có thể mở rộng thêm tùy thuộc vào yêu cầu cụ thể của ứng dụng, chẳng hạn như thêm các loại file khác hoặc điều chỉnh giới hạn kích thước.