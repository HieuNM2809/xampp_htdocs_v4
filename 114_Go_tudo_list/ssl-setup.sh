#!/bin/bash

# SSL Setup Script using Let's Encrypt
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 your-domain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@${DOMAIN}"}

print_status "Setting up SSL certificate for $DOMAIN"

# Install certbot
if ! command -v certbot &> /dev/null; then
    print_status "Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

print_status "Obtaining SSL certificate..."

# For Docker deployment
if [ -f "docker-compose.prod.yml" ]; then
    print_status "Detected Docker deployment. Setting up SSL for Docker..."
    
    # Stop nginx container temporarily
    docker-compose -f docker-compose.prod.yml stop nginx || true
    
    # Get certificate
    sudo certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN
    
    # Create SSL directory
    sudo mkdir -p ./ssl
    
    # Copy certificates to project directory
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/
    sudo chmod 644 ./ssl/*.pem
    
    print_status "Updating Nginx configuration for SSL..."
    
    # Update nginx config to enable SSL
    sed -i "s/server_name _;/server_name $DOMAIN;/" nginx.prod.conf
    
    # Add SSL server block if not exists
    if ! grep -q "listen 443" nginx.prod.conf; then
        cat >> nginx.prod.conf << 'EOF'

# SSL Configuration
server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Same configuration as HTTP server
    # (Copy all location blocks from HTTP server)
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    return 301 https://$server_name$request_uri;
}
EOF
        
        sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx.prod.conf
    fi
    
    # Restart containers
    docker-compose -f docker-compose.prod.yml up -d
    
else
    # For direct deployment
    print_status "Direct deployment detected. Setting up SSL with Nginx..."
    
    # Get certificate with nginx plugin
    sudo certbot --nginx \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN \
        --redirect
fi

# Setup auto-renewal
print_status "Setting up automatic renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run

print_status "✅ SSL certificate installed successfully!"
echo
echo "Your site is now available at:"
echo "  - https://$DOMAIN"
echo
echo "Certificate will auto-renew. Check status with:"
echo "  - sudo certbot certificates"
echo "  - sudo systemctl status certbot.timer"
