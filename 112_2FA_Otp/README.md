# 🔐 2FA Demo Project - Ví dụ Xác thực 2 Bước

Một ứng dụng web hoàn chỉnh demonstrating Two-Factor Authentication (2FA) sử dụng TOTP (Time-based One-Time Password) với Node.js, Express, SQLite và vanilla JavaScript.

## ✨ Tính năng

- 🔒 **Đăng ký và đăng nhập** với mã hóa mật khẩu
- 📱 **2FA với TOTP** tương thích với Google Authenticator, Authy, Microsoft Authenticator
- 🔑 **Backup codes** cho trường hợp mất thiết bị
- 🎨 **Giao diện responsive** và thân thiện với người dùng
- 🛡️ **Bảo mật cao** với session management và CSRF protection
- 📊 **Dashboard** quản lý bảo mật tài khoản

## 🚀 Cài đặt nhanh

### 1. Clone project và cài đặt dependencies

```bash
# Cài đặt Node.js packages
npm install
```

### 2. Chạy ứng dụng

```bash
# Development mode với nodemon
npm run dev

# Hoặc production mode
npm start
```

### 3. Truy cập ứng dụng

Mở trình duyệt và truy cập: `http://localhost:3000`

## 📱 Hướng dẫn sử dụng

### Bước 1: Đăng ký tài khoản

1. Truy cập trang chủ
2. Click tab **"Đăng ký"**
3. Điền thông tin:
   - Username (unique)
   - Email
   - Password (ít nhất 6 ký tự)
4. Click **"Đăng ký"**

### Bước 2: Đăng nhập

1. Click tab **"Đăng nhập"**
2. Nhập username và password
3. Click **"Đăng nhập"**

### Bước 3: Thiết lập 2FA

1. Trong dashboard, click **"Thiết lập 2FA"**
2. **Quét mã QR** bằng ứng dụng authenticator:
   - Google Authenticator (iOS/Android)
   - Authy (iOS/Android/Desktop)
   - Microsoft Authenticator
   - 1Password, Bitwarden, hoặc app TOTP khác
3. **Hoặc nhập thủ công** secret key vào ứng dụng
4. **Nhập mã 6 chữ số** từ ứng dụng để xác nhận
5. **Lưu backup codes** ở nơi an toàn

### Bước 4: Đăng nhập với 2FA

1. Đăng nhập bình thường với username/password
2. Hệ thống sẽ yêu cầu mã 2FA
3. Nhập mã từ ứng dụng authenticator
4. **Hoặc sử dụng backup code** nếu không có thiết bị

## 🔧 Cấu trúc Project

```
2fa-demo/
├── server.js              # Express server chính
├── package.json           # Dependencies và scripts
├── users.db              # SQLite database (tự tạo)
├── public/               # Frontend files
│   ├── index.html        # Giao diện chính
│   ├── style.css         # Styles responsive
│   └── script.js         # JavaScript logic
└── README.md             # Tài liệu này
```

## 🛡️ Bảo mật

### Tính năng bảo mật được implement:

- ✅ **Password hashing** với bcryptjs (salt rounds: 10)
- ✅ **Session-based authentication** với express-session
- ✅ **TOTP với window tolerance** (±60 giây)
- ✅ **Backup codes hashed** và one-time use
- ✅ **Input validation** và sanitization
- ✅ **HTTPS ready** (cần SSL certificate cho production)

### Cần cải thiện cho production:

- 🔄 Thêm rate limiting cho login attempts
- 🔄 CSRF protection với csurf middleware
- 🔄 Helmet.js cho security headers
- 🔄 Environment variables cho secrets
- 🔄 Database connection pooling
- 🔄 Logging và monitoring

## 🗄️ Database Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    totp_secret TEXT,
    is_2fa_enabled INTEGER DEFAULT 0,
    backup_codes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🌐 API Endpoints

### Authentication
- `POST /api/register` - Đăng ký tài khoản mới
- `POST /api/login` - Đăng nhập (với/không 2FA)
- `POST /api/logout` - Đăng xuất
- `GET /api/me` - Lấy thông tin user hiện tại

### 2FA Management
- `POST /api/setup-2fa` - Tạo TOTP secret và QR code
- `POST /api/enable-2fa` - Kích hoạt 2FA với verification
- `POST /api/disable-2fa` - Tắt 2FA (yêu cầu password)
- `POST /api/regenerate-backup-codes` - Tạo backup codes mới

## 🎨 UI/UX Features

- 📱 **Responsive design** cho mobile và desktop
- 🎭 **Modern UI** với gradients và animations
- ⚡ **Real-time feedback** với loading states
- 🔔 **Toast notifications** cho user actions
- ♿ **Accessibility** với proper ARIA labels
- 🌙 **Dark theme ready** (có thể mở rộng)

## 🧪 Testing

### Manual Testing Checklist:

- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập với tài khoản thường
- [ ] Thiết lập 2FA với QR code
- [ ] Thiết lập 2FA với manual entry
- [ ] Đăng nhập với 2FA code
- [ ] Đăng nhập với backup code
- [ ] Tắt 2FA
- [ ] Tạo lại backup codes
- [ ] Test trên mobile devices

### Authenticator Apps để test:

1. **Google Authenticator** (Free - iOS/Android)
2. **Authy** (Free - iOS/Android/Desktop)
3. **Microsoft Authenticator** (Free - iOS/Android)
4. **1Password** (Premium)
5. **Bitwarden** (Free/Premium)

## 📦 Dependencies Chính

### Backend:
- `express` - Web framework
- `sqlite3` - Database
- `bcryptjs` - Password hashing
- `speakeasy` - TOTP generation/verification
- `qrcode` - QR code generation
- `express-session` - Session management

### Frontend:
- Vanilla JavaScript (ES6+)
- Font Awesome icons
- CSS Grid & Flexbox
- Fetch API

## 🚀 Production Deployment

### 1. Environment Setup:
```bash
# Set production environment
export NODE_ENV=production

# Secure session secret
export SESSION_SECRET="your-super-secure-secret-key"

# Database path
export DB_PATH="/path/to/production/users.db"
```

### 2. Process Management:
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "2fa-demo"

# Using systemd (Ubuntu/CentOS)
# Tạo service file tại /etc/systemd/system/2fa-demo.service
```

### 3. Nginx Reverse Proxy:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **"UNIQUE constraint failed"**
   - Username hoặc email đã tồn tại
   - Thử username/email khác

2. **"Mã TOTP không đúng"**
   - Kiểm tra thời gian trên thiết bị
   - Thử với window tolerance lớn hơn
   - Sử dụng backup code

3. **"Cannot connect to database"**
   - Kiểm tra quyền write trên thư mục
   - Restart ứng dụng

4. **QR Code không hiển thị**
   - Kiểm tra network connection
   - Clear browser cache

## 📄 License

MIT License - Sử dụng tự do cho mục đích học tập và thương mại.

## 🤝 Contributing

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📞 Hỗ trợ

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **Email**: your-email@domain.com

---

**Lưu ý**: Đây là project demo cho mục đích học tập. Để sử dụng trong production, cần thêm nhiều tính năng bảo mật khác như rate limiting, CSRF protection, và proper error handling.
