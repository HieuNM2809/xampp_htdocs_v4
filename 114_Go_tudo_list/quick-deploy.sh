#!/bin/bash

# Quick Deploy Script - One-click deployment
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════╗"
    echo "║          🚀 Go Todo App Deployment Script       ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_banner

echo "Chọn phương pháp deploy:"
echo "1) Docker (Khuyến nghị) - Dễ setup, cô lập môi trường"
echo "2) Direct Binary - Hiệu năng cao, kiểm soát tốt"
echo

read -p "Chọn (1 hoặc 2): " deploy_method

case $deploy_method in
    1)
        print_status "Bạn đã chọn Docker deployment"
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            print_warning "Docker chưa được cài đặt. Đang cài đặt..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            print_warning "Vui lòng logout và login lại để sử dụng docker"
            exit 1
        fi

        # Check if Docker Compose is installed
        if ! command -v docker-compose &> /dev/null; then
            print_warning "Docker Compose chưa được cài đặt. Đang cài đặt..."
            sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi

        # Environment setup
        if [ ! -f .env ]; then
            print_status "Tạo file cấu hình environment..."
            cp env.production .env
            
            # Generate random passwords
            DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
            
            sed -i "s/your-super-strong-password-change-this/$DB_PASSWORD/" .env
            sed -i "s/your-super-secret-jwt-key-change-this-in-production-make-it-very-long-and-random/$JWT_SECRET/" .env
            
            print_status "Đã tạo mật khẩu ngẫu nhiên an toàn"
        fi

        # Deploy with Docker
        print_status "Đang deploy với Docker..."
        chmod +x deploy-docker.sh
        ./deploy-docker.sh
        ;;
        
    2)
        print_status "Bạn đã chọn Direct Binary deployment"
        
        # Check if running as root
        if [ "$EUID" -ne 0 ]; then
            print_error "Direct deployment cần quyền root. Chạy với sudo"
            exit 1
        fi

        # Environment setup
        if [ ! -f production.env ]; then
            print_error "File production.env không tồn tại"
            exit 1
        fi

        # Generate random passwords
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        
        sed -i "s/your-strong-password-here/$DB_PASSWORD/" production.env
        sed -i "s/your-super-secret-jwt-key-for-production-change-this/$JWT_SECRET/" production.env
        
        print_status "Đã tạo mật khẩu ngẫu nhiên an toàn"

        # Deploy
        chmod +x deploy.sh
        ./deploy.sh
        ;;
        
    *)
        print_error "Lựa chọn không hợp lệ"
        exit 1
        ;;
esac

echo
print_status "🎉 Deploy hoàn tất!"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo
echo "📱 Ứng dụng của bạn đã sẵn sàng:"
echo "   Frontend: http://$SERVER_IP"
echo "   API: http://$SERVER_IP/api/v1/todos"
echo "   Health Check: http://$SERVER_IP/health"
echo

# Ask about SSL setup
read -p "Bạn có muốn setup SSL (HTTPS)? (y/n): " setup_ssl

if [ "$setup_ssl" = "y" ] || [ "$setup_ssl" = "Y" ]; then
    read -p "Nhập domain name của bạn: " domain
    if [ ! -z "$domain" ]; then
        chmod +x ssl-setup.sh
        ./ssl-setup.sh $domain
    fi
fi

print_status "✨ Tất cả đã hoàn tất! Chúc bạn sử dụng vui vẻ!"
