# 🔥 Hot Reload Setup Guide

Hot reload tự động restart ứng dụng Go khi bạn thay đổi code, giúp tăng tốc độ development đáng kể.

## 🛠️ Cài đặt Air (Hot Reload Tool)

Air là tool hot reload phổ biến nhất cho Go applications.

### Windows:
```powershell
# Cài đặt Air
.\run-windows.ps1 install-air

# Hoặc manual install
go install github.com/air-verse/air@latest
```

### Linux/macOS:
```bash
# Cài đặt Air  
make install-air

# Hoặc manual install
go install github.com/air-verse/air@latest
```

## 🚀 Chạy với Hot Reload

### Windows:
```powershell
# Setup toàn bộ môi trường (bao gồm Air)
.\run-windows.ps1 dev-setup

# Chạy với hot reload
.\run-windows.ps1 dev
```

### Linux/macOS:
```bash
# Setup toàn bộ môi trường
make dev-setup

# Chạy với hot reload
make dev
```

## ⚙️ Cấu hình Air (.air.toml)

File `.air.toml` đã được tối ưu cho dự án này:

```toml
[build]
  cmd = "go build -o ./tmp/main.exe ./cmd/api/main.go"
  bin = "./tmp/main.exe"
  exclude_dir = ["tmp", "vendor", "web/node_modules", "bin"]
  include_ext = ["go", "html"]
```

### Tính năng chính:
- 🔄 **Auto restart** khi file .go thay đổi
- 📺 **Clear screen** khi rebuild
- 🚫 **Exclude directories** không cần watch
- 📝 **Build error logging** 
- ⚡ **Fast incremental builds**

## 🎯 Workflow Development với Hot Reload

### 1. Khởi động một lần:
```bash
# Linux/macOS
make dev-setup && make dev

# Windows  
.\run-windows.ps1 dev-setup
.\run-windows.ps1 dev
```

### 2. Development loop:
1. ✏️ **Edit code** trong bất kỳ file .go nào
2. 💾 **Save file** (Ctrl+S)
3. ⚡ **Auto restart** - Air tự động rebuild và restart
4. 🔄 **Repeat** - không cần manual restart!

### 3. Kiểm tra kết quả:
- Frontend: http://localhost:8080
- API: http://localhost:8080/api/v1/todos
- Health: http://localhost:8080/health

## 🔍 Monitoring Hot Reload

Khi chạy `make dev` hoặc `.\run-windows.ps1 dev`, bạn sẽ thấy:

```
🔥 Starting with Hot Reload (Air)...
📱 Frontend: http://localhost:8080
🔗 API: http://localhost:8080/api/v1/todos
❤️  Health: http://localhost:8080/health
🔄 Auto-reloading on file changes...

  __    _   ___  
 / /\  | | | |_) 
/_/--\ |_| |_| \_ , built with Go

watching .
watching cmd
watching cmd/api
watching internal
...
ready (main.go)
```

### Khi file thay đổi:
```
cmd/api/main.go has changed
building...
running...
```

## 🐛 Troubleshooting

### Air không được cài đặt:
```bash
# Check if Air is installed
air -v

# If not found, install:
go install github.com/air-verse/air@latest

# Make sure GOPATH/bin is in PATH
echo $GOPATH/bin  # Linux/macOS
echo $env:GOPATH\bin  # Windows PowerShell
```

### Build errors:
- ❌ **Lỗi compile**: Air sẽ hiển thị lỗi và chờ bạn fix
- 📝 **Log file**: Xem `build-errors.log` để debug
- 🔄 **Auto retry**: Fix code và save - Air tự động retry

### Performance issues:
- 📁 **Exclude folders**: Air đã exclude `tmp/`, `vendor/`, `node_modules/`
- 🚫 **Exclude files**: Test files (`*_test.go`) không trigger reload
- ⚡ **Fast mode**: Build chỉ files thay đổi

## 📊 So sánh modes

| Feature | Normal (`run`) | Hot Reload (`dev`) |
|---------|----------------|-------------------|
| Auto restart | ❌ Manual | ✅ Auto |
| Build speed | 🐌 Full build | ⚡ Incremental |
| Development experience | 😐 OK | 🚀 Excellent |
| Resource usage | 💚 Lower | 🟡 Slightly higher |
| Best for | 🚀 Production testing | 🛠️ Development |

## 💡 Tips & Best Practices

### 1. **Use hot reload cho development:**
```bash
# ✅ Good - development
make dev

# ❌ Avoid - manual restart mỗi lần
make run
```

### 2. **Organize code changes:**
- Làm small, incremental changes
- Save frequently để trigger reload
- Watch console để catch build errors sớm

### 3. **Database changes:**
- Hot reload chỉ restart Go app
- Database schema changes cần restart container:
  ```bash
  make docker-down && make docker-up
  ```

### 4. **Frontend changes:**
- Static files (HTML/CSS/JS) không cần restart
- Chỉ cần refresh browser (F5)

## 🎉 Kết luận

Hot reload giúp development workflow nhanh hơn **3-5x**:
- ❌ **Trước**: Edit → Manual stop → Build → Run → Test
- ✅ **Sau**: Edit → Save → Auto restart → Test

Enjoy coding với hot reload! 🔥🚀
