# Node.js SonarQube Demo Project

Đây là project demo hướng dẫn cách sử dụng SonarQube với Docker để scan source code Node.js.

## 📋 Yêu cầu hệ thống

- Docker và Docker Compose
- Node.js (version 14+)
- npm hoặc yarn

## 🚀 Hướng dẫn cài đặt và sử dụng

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Khởi động SonarQube bằng Docker

```bash
docker-compose up -d
```

Chờ khoảng 2-3 phút để SonarQube khởi động hoàn toàn.

### Bước 3: Truy cập SonarQube Web Interface

- URL: http://localhost:9000
- Username: `admin`
- Password: `admin`

Lần đầu đăng nhập, bạn sẽ được yêu cầu đổi password.

### Bước 4: Chạy SonarQube Scanner

#### Trên Windows:
```bash
scan.bat
```

#### Trên Linux/MacOS:
```bash
chmod +x scan.sh
./scan.sh
```

#### Hoặc chạy trực tiếp bằng npm:
```bash
npm run sonar
```

### Bước 5: Xem kết quả

Sau khi scan hoàn tất, truy cập http://localhost:9000 để xem báo cáo chi tiết.

## 📊 Những gì SonarQube sẽ phát hiện

Project này có các code issues được cố ý tạo ra để demo:

### 🐛 Code Smells
- **Unused variables** (biến không sử dụng)
- **Inefficient loops** (vòng lặp không hiệu quả)
- **Duplicate code** (code trùng lặp)
- **Complex functions** (hàm phức tạp)
- **Too many parameters** (quá nhiều tham số)

### ⚠️ Code Issues
- **Use of == instead of ===** (sử dụng == thay vì ===)
- **No input validation** (không validate input)
- **Dead code** (code không được sử dụng)

### 🔒 Security Hotspots
- **Potential SQL injection** (mô phỏng SQL injection risk)

## 🛠 Cấu hình

### Tệp cấu hình chính:

1. **sonar-project.properties** - Cấu hình project SonarQube
2. **docker-compose.yml** - Cấu hình Docker containers
3. **package.json** - Dependencies và scripts

### Cấu trúc project:

```
├── src/
│   ├── app.js          # Main Express application
│   └── utils.js        # Utility functions
├── tests/
│   └── app.test.js     # Unit tests
├── docker-compose.yml  # Docker configuration
├── sonar-project.properties  # SonarQube config
├── scan.bat           # Windows scan script
├── scan.sh            # Linux/Mac scan script
└── package.json       # Project dependencies
```

## 📱 API Endpoints

- `GET /` - Welcome message
- `GET /api/users` - Lấy danh sách users
- `GET /api/users/:id` - Lấy user theo ID
- `POST /api/users` - Tạo user mới

## 🧪 Chạy tests

```bash
npm test
```

## 🔧 Troubleshooting

### SonarQube không khởi động được:
```bash
# Kiểm tra logs
docker-compose logs sonarqube

# Restart services
docker-compose down
docker-compose up -d
```

### Scanner báo lỗi connection:
- Đảm bảo SonarQube đang chạy trên port 9000
- Kiểm tra firewall không block port 9000

### Memory issues:
Nếu gặp lỗi memory, thêm vào docker-compose.yml:
```yaml
environment:
  - "SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true"
```

## 📚 Tài liệu tham khảo

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarQube JavaScript/TypeScript Analyzer](https://docs.sonarqube.org/latest/analysis/languages/javascript/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 📄 License

MIT License
