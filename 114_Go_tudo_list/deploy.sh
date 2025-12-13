#!/bin/bash

# Deploy script for Go Todo List Application
set -e

echo "🚀 Starting deployment..."

# Configuration
APP_NAME="todo-app"
APP_USER="todoapp"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="$APP_NAME.service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd --system --home-dir $APP_DIR --shell /bin/bash $APP_USER
fi

print_status "Creating application directory..."
mkdir -p $APP_DIR/{bin,logs,migrations,web}
chown -R $APP_USER:$APP_USER $APP_DIR

print_status "Building application..."
# Build for Linux if cross-compiling from Windows/Mac
GOOS=linux GOARCH=amd64 go build -o $APP_DIR/bin/$APP_NAME cmd/api/main.go

print_status "Copying application files..."
cp -r migrations/* $APP_DIR/migrations/
cp -r web/* $APP_DIR/web/
cp production.env $APP_DIR/.env

# Set permissions
chown -R $APP_USER:$APP_USER $APP_DIR
chmod +x $APP_DIR/bin/$APP_NAME

print_status "Creating systemd service..."
cp $APP_NAME.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable $SERVICE_NAME

print_status "Starting service..."
systemctl restart $SERVICE_NAME

# Check service status
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    print_status "Service started successfully!"
    systemctl status $SERVICE_NAME --no-pager -l
else
    print_error "Service failed to start!"
    journalctl -u $SERVICE_NAME -n 20 --no-pager
    exit 1
fi

print_status "Setting up Nginx..."
cp nginx-todo.conf /etc/nginx/sites-available/$APP_NAME
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

print_status "🎉 Deployment completed!"
echo
echo "Application URLs:"
echo "  - Frontend: http://your-domain.com"
echo "  - API: http://your-domain.com/api/v1/todos"
echo "  - Health: http://your-domain.com/health"
echo
echo "Useful commands:"
echo "  - Check status: sudo systemctl status $SERVICE_NAME"
echo "  - View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  - Restart: sudo systemctl restart $SERVICE_NAME"
