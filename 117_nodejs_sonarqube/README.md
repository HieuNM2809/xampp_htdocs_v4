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

**📦 Cách khuyên dùng: Docker approach (tránh path issues)**

#### Trên Windows:
```cmd
scan.bat
```

#### Trên Linux/MacOS:
```bash
chmod +x scan.sh
./scan.sh
```

**Các script đã được tối ưu để:**
- ✅ **Token-based authentication** (secure và không expire)
- ✅ **Docker Scanner** (tránh lỗi username có space) 
- ✅ **Auto-detect platform** (Windows/macOS/Linux)
- ✅ **Consistent approach** across all platforms
- ✅ **No local installation** required

#### Hoặc chạy trực tiếp bằng npm (không khuyên dùng nếu username có space):
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

1. **sonar-project.properties** - Cấu hình project và authentication token
2. **docker-compose.yml** - Cấu hình SonarQube server
3. **scan.bat / scan.sh** - Docker-based scanner scripts với token authentication
4. **package.json** - Dependencies và scripts (backup approach)

### Authentication Token:
Project đã được cấu hình sẵn với **SonarQube token** để đảm bảo:
- ✅ **Secure authentication** không cần username/password
- ✅ **No expiration** (token không hết hạn)
- ✅ **Ready to use** - chạy scan ngay mà không cần setup thêm
- 🔐 **Token**: `squ_d7b67816e257b0ce40d69777b08a94531b68fccd`

### Cấu trúc project:

```
├── src/
│   ├── app.js          # Main Express application
│   └── utils.js        # Utility functions
├── tests/
│   └── app.test.js     # Unit tests
├── docker-compose.yml  # SonarQube server configuration
├── sonar-project.properties  # SonarQube project config
├── scan.bat           # Windows Docker scanner script
├── scan.sh            # Linux/Mac Docker scanner script
└── package.json       # Project dependencies
```

### 🐳 Docker Scanner Architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Local Code    │───▶│  Scanner         │───▶│  SonarQube      │
│   (mounted)     │    │  Container       │    │  Server         │
│                 │    │  (Docker)        │    │  (localhost)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
      📁 Source           🔍 Analysis Tool        📊 Web Dashboard

Benefits:
✅ No local scanner installation required
✅ Consistent across all platforms
✅ Handles Windows username with spaces
✅ Always uses latest scanner version
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

### Scanner báo lỗi username có space (Windows):
✅ **Đã fix** - Scripts sử dụng Docker approach tự động

### Authentication:
✅ **Project đã cấu hình sẵn token** - Không cần setup thêm gì
- Token được cấu hình trong `sonar-project.properties`
- Scripts tự động sử dụng token này
- Secure và không bị expire như password

### Scanner báo lỗi connection:
- Đảm bảo SonarQube đang chạy trên port 9000
- Kiểm tra firewall không block port 9000
- Docker Scanner sẽ auto-detect platform và sử dụng URL phù hợp

### Memory issues:
Nếu gặp lỗi memory, đã được config sẵn trong docker-compose.yml:
```yaml
environment:
  SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: true
mem_limit: 2g
```

### Docker Scanner không hoạt động:
```bash
# Kiểm tra Docker đang chạy
docker --version

# Pull scanner image manually
docker pull sonarsource/sonar-scanner-cli:latest

# Test manual run
docker run --rm sonarsource/sonar-scanner-cli:latest sonar-scanner --version
```

## 📚 Tài liệu tham khảo

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarQube JavaScript/TypeScript Analyzer](https://docs.sonarqube.org/latest/analysis/languages/javascript/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 📄 License

MIT License
