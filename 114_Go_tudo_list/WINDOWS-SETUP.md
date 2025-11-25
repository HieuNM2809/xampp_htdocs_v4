# 🚀 Windows Setup Guide

## ⚠️ Khuyến nghị cho Windows Users

**Trên Windows, khuyến nghị sử dụng PowerShell script thay vì Makefile** để có trải nghiệm tốt nhất:

## 🔥 Quick Start (Khuyến nghị)

```powershell
# Setup development environment
.\run-windows.ps1 dev-setup

# Run with hot reload
.\run-windows.ps1 dev
```

## 🛠️ Chi tiết Setup

### 1. Cho phép PowerShell scripts (1 lần duy nhất)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Setup môi trường
```powershell
# Khởi động database + cài dependencies + setup hot reload
.\run-windows.ps1 dev-setup
```

### 3. Chạy ứng dụng
```powershell
# Với hot reload (khuyến nghị)
.\run-windows.ps1 dev

# Hoặc chạy bình thường
.\run-windows.ps1 run
```

### 4. Mở trong browser
```powershell
# Terminal mới
.\run-windows.ps1 open
```

## 📋 Tất cả lệnh PowerShell

```powershell
# Setup & Installation
.\run-windows.ps1 dev-setup      # Setup toàn bộ
.\run-windows.ps1 install-air    # Cài Air (hot reload)
.\run-windows.ps1 deps          # Cài Go dependencies

# Development  
.\run-windows.ps1 dev           # 🔥 Hot reload
.\run-windows.ps1 run           # Chạy bình thường
.\run-windows.ps1 build         # Build ứng dụng

# Docker
.\run-windows.ps1 docker-up     # Khởi động PostgreSQL
.\run-windows.ps1 docker-down   # Dừng services
.\run-windows.ps1 logs          # Xem logs

# Testing & Utils
.\run-windows.ps1 test-api      # Test API endpoints
.\run-windows.ps1 open          # Mở browser
.\run-windows.ps1 status        # Check trạng thái
.\run-windows.ps1 clean         # Dọn dẹp
.\run-windows.ps1 help          # Xem tất cả lệnh
```

## 🐛 Sự khác biệt với Makefile

| Feature | PowerShell Script | Makefile trên Windows |
|---------|------------------|----------------------|
| Sleep command | ✅ `Start-Sleep` | ❌ `sleep` không tồn tại |
| Path handling | ✅ Windows paths | ❌ Unix paths |
| Command checking | ✅ PowerShell cmdlets | ❌ Unix commands |
| Error handling | ✅ Native Windows | ❌ Bash syntax errors |
| Colored output | ✅ Native colors | ❌ Limited support |
| User experience | ✅ Windows-optimized | ❌ Unix-designed |

## ⚡ Development Workflow

```powershell
# 1. Một lần setup
.\run-windows.ps1 dev-setup

# 2. Daily development
.\run-windows.ps1 dev          # Chạy với hot reload

# 3. Edit code -> Save -> Auto restart! 🔥

# 4. Test API
.\run-windows.ps1 test-api

# 5. Khi xong
.\run-windows.ps1 docker-down
```

## 🔧 Nếu muốn dùng Makefile

Nếu bạn vẫn muốn sử dụng `make` trên Windows:

### Option 1: Git Bash (Khuyến nghị)
```bash
# Mở Git Bash (nếu đã cài Git for Windows)
make dev-setup
make dev
```

### Option 2: WSL (Windows Subsystem for Linux)
```bash
# Mở WSL
make dev-setup
make dev  
```

### Option 3: Chocolatey Make
```powershell
# Cài make qua Chocolatey
choco install make

# Sau đó dùng make
make dev-setup
make dev
```

## 🚨 Fix lỗi Air installation

Nếu bạn gặp lỗi:
```
go: github.com/cosmtrek/air@latest: version constraints conflict:
        module declares its path as: github.com/air-verse/air
                but was required as: github.com/cosmtrek/air
```

**Nguyên nhân**: Air repository đã chuyển từ `cosmtrek/air` sang `air-verse/air`

**Giải pháp**: Sử dụng repository mới:
```powershell
# Install Air với repository mới
go install github.com/air-verse/air@latest

# Hoặc dùng script (đã được fix)
.\run-windows.ps1 install-air
```

## 🎯 Khuyến nghị

**✅ Sử dụng PowerShell script** cho Windows để:
- Tránh compatibility issues
- Có colored output đẹp
- Error handling tốt hơn
- Commands Windows-native
- User experience tốt nhất

**❌ Tránh Makefile trực tiếp** trên Windows Command Prompt/PowerShell vì:
- Unix commands không tồn tại
- Path handling khác biệt
- Sleep commands không work
- Bash syntax errors

## 🚀 Kết luận

PowerShell script đã được optimize đầy đủ cho Windows development, sử dụng nó để có trải nghiệm tốt nhất! 

```powershell
.\run-windows.ps1 help  # Xem tất cả options
```
