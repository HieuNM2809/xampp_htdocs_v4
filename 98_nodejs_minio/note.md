Dưới đây là hướng dẫn chi tiết từ lúc cài đặt MinIO trên Docker đến khi tích hợp MinIO vào ứng dụng Node.js.

---

## Phần 1: Cài Đặt MinIO Trên Docker

### 1.1. Sử Dụng Lệnh Docker Run

1. **Kéo image MinIO từ Docker Hub:**

   ```bash
   docker pull minio/minio
   ```

2. **Chạy container MinIO:**

   ```bash
   docker run -p 9000:9000 --name minio \
     -e MINIO_ROOT_USER=admin \
     -e MINIO_ROOT_PASSWORD=password \
     -v ./data:/data \
     minio/minio server /data
   ```

   **Giải thích:**
   - `-p 9000:9000`: Mở cổng 9000 để truy cập giao diện web và API của MinIO.
   - `--name minio`: Đặt tên cho container là "minio".
   - `-e MINIO_ROOT_USER` và `-e MINIO_ROOT_PASSWORD`: Thiết lập tài khoản truy cập (ở đây là `admin` và `password`).
   - `-v /path/to/your/local/folder:/data`: Gắn kết thư mục trên máy host (thay đổi `/path/to/your/local/folder` theo mong muốn) với thư mục `/data` trong container.
   - `minio/minio server /data`: Chạy MinIO với thư mục `/data` là nơi lưu trữ dữ liệu.

3. **Truy Cập Giao Diện Web MinIO:**

   Mở trình duyệt và truy cập [http://localhost:9000](http://localhost:9000). Đăng nhập với:
   - **Username:** `admin`
   - **Password:** `password`

---

### 1.2. Sử Dụng Docker Compose (Tùy chọn)

Nếu bạn thích dùng Docker Compose, tạo file `docker-compose.yml` với nội dung:

```yaml
version: '3.7'

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password
    volumes:
      - ./data:/data
    ports:
      - "9000:9000"
    command: server /data
```

**Cách chạy:**

1. Lưu file `docker-compose.yml` vào thư mục làm việc.
2. Mở terminal, di chuyển đến thư mục chứa file đó và chạy:

   ```bash
   docker-compose up -d
   ```

3. Sau khi container chạy, truy cập [http://localhost:9000](http://localhost:9000) để kiểm tra.

---

## Phần 2: Tích Hợp MinIO Vào Node.js

Chúng ta sẽ sử dụng thư viện [minio](https://github.com/minio/minio-js) để giao tiếp với MinIO từ Node.js.

### 2.1. Cài Đặt Thư Viện MinIO

Trong thư mục dự án Node.js của bạn, chạy lệnh:

```bash
npm install minio
```

### 2.2. Khởi Tạo Client MinIO

Tạo file `minioClient.js` với nội dung:

```javascript
const Minio = require('minio');

// Khởi tạo MinIO client với cấu hình đã thiết lập
const minioClient = new Minio.Client({
  endPoint: 'localhost',      // Địa chỉ MinIO server (localhost khi chạy trên máy)
  port: 9000,                 // Cổng của MinIO server
  useSSL: false,              // Sử dụng SSL hay không (ở đây là false)
  accessKey: 'admin',         // Access Key của MinIO
  secretKey: 'password'       // Secret Key của MinIO
});

module.exports = minioClient;
```

### 2.3. Kiểm Tra Và Tạo Bucket (Nếu Chưa Tồn Tại)

Ví dụ, tạo bucket có tên `mybucket`:

```javascript
const minioClient = require('./minioClient');

const bucketName = 'mybucket';
const region = 'us-east-1'; // MinIO không bắt buộc region, nhưng vẫn cần truyền giá trị

minioClient.bucketExists(bucketName, (err) => {
  if (err) {
    // Nếu bucket chưa tồn tại, tạo mới
    minioClient.makeBucket(bucketName, region, (err) => {
      if (err) {
        return console.error('Lỗi tạo bucket:', err);
      }
      console.log(`Bucket '${bucketName}' đã được tạo thành công.`);
    });
  } else {
    console.log(`Bucket '${bucketName}' đã tồn tại.`);
  }
});
```

### 2.4. Upload File Lên MinIO

Có 2 cách upload file: sử dụng đường dẫn file (fPutObject) hoặc sử dụng stream (putObject).

#### A. Upload Bằng `fPutObject`

Giả sử bạn có file `test-image.jpg` trong thư mục dự án:

```javascript
const minioClient = require('./minioClient');
const bucketName = 'mybucket';
const filePath = './test-image.jpg'; // Đường dẫn tới file cần upload
const objectName = 'test-image.jpg'; // Tên file khi lưu trên MinIO
const metaData = {
  'Content-Type': 'image/jpeg'
};

minioClient.fPutObject(bucketName, objectName, filePath, metaData, (err, etag) => {
  if (err) {
    return console.error('Lỗi upload file:', err);
  }
  console.log('File upload thành công. ETag:', etag);
});
```

#### B. Upload Bằng Stream

```javascript
const fs = require('fs');
const minioClient = require('./minioClient');
const bucketName = 'mybucket';
const filePath = './test-image.jpg';
const objectName = 'test-image.jpg';
const metaData = {
  'Content-Type': 'image/jpeg'
};

// Tạo stream từ file
const fileStream = fs.createReadStream(filePath);

minioClient.putObject(bucketName, objectName, fileStream, metaData, (err, etag) => {
  if (err) {
    return console.error('Lỗi upload file:', err);
  }
  console.log('File upload thành công. ETag:', etag);
});
```

---

## Phần 3: Tích Hợp MinIO Vào API Node.js (Express)

Nếu bạn muốn xây dựng API upload file sử dụng Express, bạn có thể dùng thư viện [multer](https://github.com/expressjs/multer) để xử lý file upload từ phía client.

### 3.1. Cài Đặt Express Và Multer

Chạy lệnh:

```bash
npm install express multer
```

### 3.2. Tạo File `app.js`

```javascript
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
```

### 3.3. Chạy Server

Chạy lệnh sau để khởi động server:

```bash
node app.js
```

Giờ đây, bạn có thể sử dụng Postman hoặc giao diện HTML để gửi file đến endpoint `http://localhost:3000/upload` với phương thức `POST` và trường file có tên là `file`.

---


### 3.4. Postman

```bash

curl --location 'http://localhost:3000/upload' \
--form 'file=@"/C:/Users/nguye/Downloads/calculate_distance_and_type_order_1739440657.xlsx"'
```

### 3.5. Truy Cập File Qua URL

Sau khi bucket được cấu hình public, bạn có thể truy cập hình ảnh bằng URL:

```bash
http://<server-ip>:9000/mybucket/test-image.jpg
```

---


## Tổng Kết

1. **Docker MinIO:**  
   - Cài đặt MinIO thông qua Docker (dùng lệnh `docker run` hoặc Docker Compose).
   - Truy cập giao diện quản lý tại [http://localhost:9000](http://localhost:9000).

2. **Tích Hợp Node.js:**  
   - Cài đặt thư viện `minio` và khởi tạo client trong Node.js.
   - Kiểm tra và tạo bucket nếu chưa tồn tại.
   - Upload file lên MinIO (sử dụng `fPutObject` hoặc `putObject`).
   - (Tùy chọn) Xây dựng API upload file sử dụng Express và Multer.

Với các bước trên, bạn đã hoàn thiện quá trình cài đặt MinIO trên Docker và tích hợp thành công vào ứng dụng Node.js của mình. Nếu có thắc mắc hoặc cần hỗ trợ thêm, hãy cho tôi biết!