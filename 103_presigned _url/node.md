Dưới đây là một ví dụ **rất chi tiết** và **dễ hiểu** về cách triển khai cơ chế presigned URL S3 (MinIO) với **Node.js** (Express + AWS SDK v3) kết hợp **giao diện web** đơn giản để upload/download.

Bạn sẽ có một service Node.js cung cấp **API** để tạo presigned URLs, và một trang **UI** tĩnh cho phép người dùng chọn file, upload lên MinIO và download về lại.

---

## 1. Cấu trúc project

```
presigned-demo/
├── docker-compose.yml
└── app/
    ├── Dockerfile
    ├── package.json
    ├── index.js         # Express server + API
    └── public/
        └── index.html   # Giao diện frontend
```

---

## 2. Docker Compose

```yaml
# presigned-demo/docker-compose.yml
version: '3.8'

services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # Web Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  app:
    build: ./app
    depends_on:
      - minio
    ports:
      - "3000:3000"    # Express server
    environment:
      AWS_ACCESS_KEY_ID:     minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin
      AWS_REGION:            us-east-1
      S3_ENDPOINT:           http://minio:9000
      S3_BUCKET:             my-bucket

volumes:
  minio_data:
```

* **minio**: chạy MinIO ở cổng 9000 (API) và 9001 (console web).
* **app**: service Node.js chạy Express trên cổng 3000, mount code tại `./app`.

---

## 3. Server với Express + AWS SDK v3

```js
// presigned-demo/app/index.js
const express = require('express');
const path = require('path');
const {
  S3Client, CreateBucketCommand,
  PutObjectCommand, GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

require('dotenv').config();
const app = express();
const port = 3000;

// Đọc config từ biến môi trường
const {
  AWS_REGION, AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY, S3_ENDPOINT,
  S3_BUCKET
} = process.env;

// Khởi tạo S3Client cho MinIO
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  },
  endpoint: S3_ENDPOINT,
  forcePathStyle: true
});

// Middleware để serve file static (UI)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 1) Đảm bảo bucket tồn tại
(async () => {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`✔ Bucket "${S3_BUCKET}" ready.`);
  } catch (err) {
    if (err.name === 'BucketAlreadyOwnedByYou') {
      console.log(`ℹ Bucket "${S3_BUCKET}" already exists.`);
    } else {
      console.error('✖ Error creating bucket:', err);
    }
  }
})();

// 2) API: tạo presigned PUT URL
//    POST /api/upload-url   { "filename": "example.txt" }
app.post('/api/upload-url', async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: filename,
    // bạn có thể chỉ định ContentType, ACL... tại đây
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  res.json({ url });
});

// 3) API: tạo presigned GET URL
//    GET /api/download-url?filename=example.txt
app.get('/api/download-url', async (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }
  const cmd = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: filename
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  res.json({ url });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
```

* **`/api/upload-url`**: nhận `filename` từ body, trả về presigned PUT URL.
* **`/api/download-url`**: nhận `filename` qua query, trả về presigned GET URL.
* Serve toàn bộ folder `public/` để hiển thị UI.

---

## 4. Giao diện frontend (HTML + JS)

```html
<!-- presigned-demo/app/public/index.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Presigned URL Demo</title>
  <style>
    body { font-family: sans-serif; margin: 2em; }
    input, button { margin: .5em 0; }
    #log { white-space: pre-wrap; background: #f0f0f0; padding: 1em; height: 200px; overflow: auto; }
  </style>
</head>
<body>
  <h1>Upload / Download với Presigned URL</h1>

  <!-- Chọn file để upload -->
  <input type="file" id="fileInput" /><br>
  <button id="uploadBtn">Upload lên MinIO</button>

  <hr>

  <!-- Nhập tên file để download -->
  <input type="text" id="downloadKey" placeholder="Tên file (ví dụ: example.txt)" />
  <button id="downloadBtn">Tạo link Download</button>

  <hr>

  <h2>Log</h2>
  <div id="log"></div>

  <script>
    const log = msg => {
      document.getElementById('log').textContent += msg + '\\n';
    };

    // UPLOAD
    document.getElementById('uploadBtn').onclick = async () => {
      const fileInput = document.getElementById('fileInput');
      if (!fileInput.files.length) return alert('Hãy chọn file trước.');
      const file = fileInput.files[0];
      // 1) Lấy presigned URL từ server
      log(`👉 Yêu cầu presigned URL cho ${file.name}...`);
      const res1 = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name })
      });
      const { url: uploadUrl } = await res1.json();
      log(`✔ Got PUT URL. Upload đang diễn ra...`);
      // 2) PUT file thẳng tới MinIO
      const res2 = await fetch(uploadUrl, {
        method: 'PUT',
        body: file
      });
      if (res2.ok) {
        log(`🎉 Upload thành công! File key = "${file.name}"`);
      } else {
        log(`❌ Upload thất bại: ${res2.status}`);
      }
    };

    // DOWNLOAD
    document.getElementById('downloadBtn').onclick = async () => {
      const key = document.getElementById('downloadKey').value.trim();
      if (!key) return alert('Nhập vào tên file.');
      log(`👉 Yêu cầu presigned GET URL cho "${key}"...`);
      const res = await fetch(`/api/download-url?filename=${encodeURIComponent(key)}`);
      const { url: downloadUrl } = await res.json();
      log(`✔ Got GET URL. Bắt đầu download...`);
      // 2 cách download: redirect hoặc fetch blob
      // Cách đơn giản: mở link mới
      window.open(downloadUrl, '_blank');
    };
  </script>
</body>
</html>
```

* **Upload flow**

  1. Người dùng chọn file → click “Upload lên MinIO”
  2. Frontend gọi POST `/api/upload-url` → nhận presigned PUT URL
  3. Frontend PUT file trực tiếp tới MinIO bằng URL đó → hiển thị log kết quả

* **Download flow**

  1. Người dùng nhập tên file đã upload → click “Tạo link Download”
  2. Frontend gọi GET `/api/download-url?filename=...` → nhận presigned GET URL
  3. Mở presigned URL trong tab mới → browser tự download file

---

## 5. Chạy thử

1. **Khởi động**

   ```bash
   cd presigned-demo
   docker-compose up --build
   ```
2. **Mở trình duyệt** → [http://localhost:3000](http://localhost:3000)
3. **Upload file**: chọn file, click “Upload lên MinIO” → check log → bạn sẽ thấy “🎉 Upload thành công!”.
4. **Download file**: nhập đúng tên file (ví dụ `yourfile.png`), click “Tạo link Download” → file sẽ tự động được tải về.
5. **Kiểm tra bucket**: truy cập MinIO Console [http://localhost:9001](http://localhost:9001) (user/pass: `minioadmin`) để xem trực tiếp object đã được tạo.

---

## 6. Giải thích nhanh

* **Express server** trả về presigned URLs qua hai endpoint rất đơn giản.
* **AWS SDK v3** và `getSignedUrl()` tự lo toàn bộ chữ ký V4.
* **Frontend** chỉ cần gọi API, rồi `fetch(uploadUrl, { method: 'PUT', body: file })` để upload, hoặc mở GET-URL để download.
* Toàn bộ traffic file đi **thẳng** client ↔ MinIO, server Node.js chỉ tạo URL chứ không “ghé ngang” dữ liệu.

---

Chúc bạn triển khai thành công! Nếu có chỗ nào chưa rõ, hoặc muốn mở rộng thêm (như giới hạn file size, CORS, POST policy…), cứ hỏi tiếp nhé.
