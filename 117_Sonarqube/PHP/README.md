# PHP SonarQube Demo Project

Đây là project demo hướng dẫn cách sử dụng SonarQube với Docker để scan source code PHP.

## 📋 Yêu cầu hệ thống

- Docker và Docker Compose
- PHP 8.0+ (tùy chọn, có thể chạy trong container)
- Composer (tùy chọn, có thể chạy trong container)

## 🚀 Hướng dẫn cài đặt và sử dụng

### Bước 1: Cài đặt dependencies

**Cách 1: Sử dụng Composer local**
```bash
composer install
```

**Cách 2: Sử dụng Docker Composer**
```bash
docker run --rm -v $(pwd):/app composer:latest install
```

### Bước 2: Khởi động SonarQube và PHP server

```bash
docker-compose up -d
```

Services sẽ khởi động:
- **SonarQube**: http://localhost:9000
- **PHP Application**: http://localhost:8000
- **PostgreSQL**: localhost:5432

Chờ khoảng 2-3 phút để SonarQube khởi động hoàn toàn.

### Bước 3: Truy cập SonarQube Web Interface

- URL: http://localhost:9000
- Username: `admin`
- Password: `admin`

Lần đầu đăng nhập, bạn sẽ được yêu cầu đổi password.

### Bước 4: Test PHP Application

Truy cập http://localhost:8000 hoặc test các API endpoints:

```bash
# Welcome message
curl http://localhost:8000/

# Get all users
curl http://localhost:8000/api/users

# Get user by ID
curl http://localhost:8000/api/users/1

# Create new user
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"New User","email":"newuser@example.com"}'
```

### Bước 5: Chạy SonarQube Scanner

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

### Bước 6: Xem kết quả

Sau khi scan hoàn tất, truy cập http://localhost:9000 để xem báo cáo chi tiết.

## 📊 Những gì SonarQube sẽ phát hiện

Project này có các code issues được cố ý tạo ra để demo:

### 🐛 Code Smells

#### **Duplicate Code**
- `validateEmail()` và `checkEmailFormat()` trong `Application.php`
- `isValidEmail()` và `checkEmail()` trong `UserUtils.php`
- Email regex patterns được lặp lại nhiều lần

#### **Unused Code**
- `$unusedVariable` trong constructor
- `$debugInfo` variable không được sử dụng
- `unusedFunction()` - function không bao giờ được gọi
- `UnusedUtility` class không được sử dụng

#### **Complex Functions** 
- `complexFunction()` - quá nhiều nested if statements
- `processUserData()` - cognitive complexity cao

#### **Code Style Issues**
- `formatUserData()` có unused parameter `$options`
- `createDetailedUser()` có quá nhiều parameters (9 parameters)

### ⚠️ Code Issues

#### **Comparison Issues**
- Sử dụng `==` thay vì `===` trong `getUserById()`
- Loose type comparisons có thể gây bugs

#### **No Input Validation**
- `createUser()` không validate input
- API endpoints thiếu validation

#### **Inefficient Code**
- Loop không tối ưu trong `getUserById()`
- Manual array search thay vì built-in functions

### 🔒 Security Hotspots

#### **SQL Injection**
- `searchUsers()` - string concatenation trong SQL simulation
- `DatabaseUtils::executeQuery()` - raw SQL execution
- `DatabaseUtils::buildQuery()` - dynamic query building
- `DatabaseUtils::getUserById()` - direct parameter injection

#### **Command Injection**
- `UserUtils::readFile()` - shell_exec với user input
- Potential command injection vulnerability

#### **File Inclusion**
- `UserUtils::includeFile()` - dynamic file inclusion
- Path traversal vulnerability risk

#### **Weak Cryptography**
- `UserUtils::hashPassword()` - sử dụng MD5 (weak algorithm)
- Không sử dụng proper password hashing

#### **Information Disclosure**
- `UserUtils::debugDump()` - outputs sensitive data
- Debug information có thể leak ra production

## 🛠 Cấu hình

### Tệp cấu hình chính:

1. **sonar-project.properties** - Cấu hình project và authentication token
2. **docker-compose.yml** - SonarQube server + PHP application
3. **scan.bat / scan.sh** - Docker-based scanner scripts với token authentication
4. **composer.json** - PHP dependencies và scripts

### Authentication Token:
Project đã được cấu hình sẵn với **SonarQube token** để đảm bảo:
- ✅ **Secure authentication** không cần username/password
- ✅ **No expiration** (token không hết hạn)
- ✅ **Ready to use** - chạy scan ngay mà không cần setup thêm
- 🔐 **Token**: `squ_d7b67816e257b0ce40d69777b08a94531b68fccd`

### Cấu trúc project:

```
├── src/
│   ├── Application.php      # Main application logic
│   ├── Models/
│   │   └── User.php         # User model class
│   └── Utils/
│       └── UserUtils.php    # Utility functions
├── tests/
│   ├── ApplicationTest.php  # Application unit tests
│   └── UserTest.php        # User model tests
├── public/
│   └── index.php           # Web entry point
├── docker-compose.yml      # SonarQube + PHP services
├── sonar-project.properties # SonarQube project config
├── scan.bat               # Windows Docker scanner script
├── scan.sh                # Linux/Mac Docker scanner script
└── composer.json          # Project dependencies
```

### 🐳 Docker Architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PHP Source    │───▶│  Scanner         │───▶│  SonarQube      │
│   (mounted)     │    │  Container       │    │  Server         │
│                 │    │  (Docker)        │    │  (localhost)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
      📁 Source           🔍 Analysis Tool        📊 Web Dashboard

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │───▶│  PHP Server      │───▶│  PostgreSQL     │
│                 │    │  Container       │    │  Database       │
│                 │    │  (port 8000)     │    │  (port 5432)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
      💻 Client           🐘 PHP Runtime          🗄️  Data Storage

Benefits:
✅ Complete development environment in containers
✅ No local PHP/Composer installation required  
✅ Consistent across all platforms
✅ Isolated services with proper networking
```

## 📱 API Endpoints

- `GET /` - Welcome message
- `GET /api/users` - Lấy danh sách users
- `GET /api/users/:id` - Lấy user theo ID
- `POST /api/users` - Tạo user mới (JSON body: name, email)

## 🧪 Chạy tests

**Sử dụng PHPUnit local:**
```bash
vendor/bin/phpunit
```

**Sử dụng Docker:**
```bash
docker run --rm -v $(pwd):/app -w /app php:8.2-cli vendor/bin/phpunit
```

**Hoặc sử dụng Composer scripts:**
```bash
composer test
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

### PHP Application không accessible:
```bash
# Kiểm tra PHP container
docker-compose logs php

# Test PHP server
curl http://localhost:8000/
```

### Composer install lỗi:
```bash
# Clear composer cache
docker run --rm -v $(pwd):/app composer:latest clear-cache

# Reinstall dependencies
docker run --rm -v $(pwd):/app composer:latest install --no-cache
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

### Test failures:
```bash
# Run specific test
vendor/bin/phpunit tests/UserTest.php

# Run with verbose output
vendor/bin/phpunit --verbose

# Generate test coverage (requires Xdebug)
vendor/bin/phpunit --coverage-html coverage/
```

## 📈 Code Quality Metrics

Sau khi scan, bạn sẽ thấy các metrics như:

### 📊 **Code Smells** 
- **Duplicate Code**: ~8-10 instances
- **Unused Variables**: ~5 instances  
- **Complex Functions**: ~3 functions
- **Long Parameter Lists**: ~2 functions

### ⚠️ **Code Issues**
- **Type Comparison**: ~2 issues
- **Missing Validation**: ~3 issues
- **Inefficient Code**: ~2 issues

### 🔒 **Security Hotspots**
- **SQL Injection**: ~4 hotspots
- **Command Injection**: ~1 hotspot
- **File Inclusion**: ~1 hotspot
- **Weak Crypto**: ~1 hotspot
- **Info Disclosure**: ~1 hotspot

### 🧪 **Test Coverage**
- Lines covered: ~80%+ (nếu chạy với coverage)
- Functions tested: Majority của public methods

## 📚 PHP-Specific SonarQube Rules

### Các rule quan trọng sẽ được kiểm tra:

1. **Security Rules**
   - S2068: Hardcoded credentials
   - S2083: File path injection
   - S2091: XPath injection
   - S5122: CORS policy

2. **Code Smell Rules** 
   - S1172: Unused parameters
   - S1481: Unused variables
   - S3776: Complex functions
   - S107: Too many parameters

3. **Bug Rules**
   - S2184: Impossible comparisons  
   - S3981: Collection sizes should be checked
   - S5542: Encryption algorithms should be robust

## 📚 Tài liệu tham khảo

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarQube PHP Analyzer](https://docs.sonarqube.org/latest/analysis/languages/php/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [Composer Documentation](https://getcomposer.org/doc/)

## 📄 License

MIT License
