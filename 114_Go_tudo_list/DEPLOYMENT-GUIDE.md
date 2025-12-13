# 🚀 Hướng Dẫn Deploy Go Todo List lên VPS

## 📋 Tổng Quan

Project này hỗ trợ 2 phương pháp deploy chính:
1. **Docker (Khuyến nghị)** - Dễ dàng, cô lập môi trường
2. **Direct Binary** - Hiệu năng cao, kiểm soát tốt

## 🐳 Phương Pháp 1: Deploy Với Docker (Khuyến Nghị)

### Yêu Cầu
- VPS với Ubuntu 20.04+ hoặc CentOS 7+
- 1GB RAM tối thiểu (2GB khuyến nghị)
- 10GB dung lượng đĩa
- Domain name (tùy chọn cho SSL)

### Bước 1: Chuẩn Bị VPS

```bash
# Kết nối VPS
ssh root@your-vps-ip

# Cập nhật system
apt update && apt upgrade -y

# Cài đặt Git
apt install -y git curl
```

### Bước 2: Upload Code

```bash
# Clone hoặc upload code
git clone https://github.com/your-username/todo-app.git
# hoặc scp từ máy local
```

### Bước 3: Cấu Hình Environment

```bash
# Copy và chỉnh sửa file environment
cp env.production .env

# Chỉnh sửa file .env
nano .env
```

**Quan trọng**: Thay đổi các giá trị sau trong `.env`:
- `DB_PASSWORD`: Mật khẩu database mạnh
- `JWT_SECRET`: Chuỗi bí mật dài và phức tạp

### Bước 4: Deploy

```bash
# Chạy script deploy
chmod +x deploy-docker.sh
./deploy-docker.sh
```

### Bước 5: Kiểm Tra

```bash
# Kiểm tra trạng thái containers
docker-compose -f docker-compose.prod.yml ps

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f

# Test API
curl http://localhost/health
```

### Bước 6: Setup SSL (Tùy chọn)

```bash
# Cài đặt SSL với Let's Encrypt
chmod +x ssl-setup.sh
./ssl-setup.sh your-domain.com
```

## 💻 Phương Pháp 2: Deploy Direct Binary

### Bước 1: Chuẩn Bị Server

```bash
# Cài đặt PostgreSQL, Nginx, Go
apt update && apt upgrade -y
apt install -y postgresql postgresql-contrib nginx

# Cài đặt Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### Bước 2: Setup Database

```bash
sudo -i -u postgres
psql -c "CREATE DATABASE todolist_db;"
psql -c "CREATE USER todouser WITH PASSWORD 'strong-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE todolist_db TO todouser;"
exit
```

### Bước 3: Deploy Application

```bash
# Chỉnh sửa production.env
nano production.env

# Chạy script deploy
chmod +x deploy.sh
sudo ./deploy.sh
```

## 🔧 Quản Lý Sau Deploy

### Docker Commands

```bash
# Xem logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update application
git pull
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Backup database
docker exec todolist-postgres-prod pg_dump -U todouser todolist_db > backup.sql
```

### Direct Binary Commands

```bash
# Kiểm tra service
sudo systemctl status todo-app

# Xem logs
sudo journalctl -u todo-app -f

# Restart service
sudo systemctl restart todo-app

# Update application
git pull
make build
sudo systemctl restart todo-app
```

## 🔒 Bảo Mật

### Checklist Bảo Mật Cơ Bản

- [ ] Thay đổi mật khẩu database default
- [ ] Sử dụng JWT secret mạnh
- [ ] Cấu hình firewall (UFW)
- [ ] Setup SSL/HTTPS
- [ ] Cập nhật thường xuyên
- [ ] Backup database định kỳ

### Cấu Hình Firewall

```bash
# Cài đặt UFW
apt install -y ufw

# Cấu hình rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Bật firewall
ufw enable
```

## 📊 Monitoring

### Health Check Endpoints

- **Health**: `http://your-domain/health`
- **API**: `http://your-domain/api/v1/todos`

### Logs Location

**Docker:**
```bash
docker-compose -f docker-compose.prod.yml logs
```

**Direct Binary:**
```bash
sudo journalctl -u todo-app
```

## 🔄 Backup & Restore

### Database Backup

```bash
# Docker
docker exec todolist-postgres-prod pg_dump -U todouser todolist_db > backup_$(date +%Y%m%d).sql

# Direct
sudo -u postgres pg_dump todolist_db > backup_$(date +%Y%m%d).sql
```

### Database Restore

```bash
# Docker
docker exec -i todolist-postgres-prod psql -U todouser todolist_db < backup.sql

# Direct
sudo -u postgres psql todolist_db < backup.sql
```

## 🚨 Troubleshooting

### Lỗi Thường Gặp

1. **Container không start**
   ```bash
   docker-compose -f docker-compose.prod.yml logs
   ```

2. **Database connection failed**
   - Kiểm tra PostgreSQL service
   - Xác thực credentials trong .env

3. **502 Bad Gateway**
   - Kiểm tra app container có chạy không
   - Xem logs của nginx và app

4. **Permission denied**
   ```bash
   sudo chown -R $USER:$USER /path/to/project
   ```

### Performance Tuning

```bash
# Tăng file limits
echo 'fs.file-max = 65536' >> /etc/sysctl.conf
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf
```

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs
2. Xem troubleshooting section
3. Tạo issue trên GitHub

---

**🎉 Chúc bạn deploy thành công!** 🚀
