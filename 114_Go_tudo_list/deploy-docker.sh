#!/bin/bash

# Docker deployment script for VPS
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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Installing Docker..."
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    
    print_warning "Please logout and login again to use docker without sudo"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Installing..."
    
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

print_status "Checking environment file..."
if [ ! -f .env ]; then
    if [ -f .env.prod ]; then
        print_warning "Copying .env.prod to .env"
        cp .env.prod .env
        print_warning "Please edit .env file and update all passwords and secrets!"
    else
        print_error ".env file not found. Please create one based on .env.prod"
        exit 1
    fi
fi

print_status "Building and starting containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

print_status "Waiting for services to be healthy..."
sleep 10

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
    print_status "Services started successfully!"
else
    print_error "Some services failed to start. Checking logs..."
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

print_status "Testing application..."
if curl -f http://localhost/health &> /dev/null; then
    print_status "✅ Application is responding!"
else
    print_warning "Application might not be ready yet. Check logs:"
    docker-compose -f docker-compose.prod.yml logs app
fi

print_status "🎉 Deployment completed!"
echo
echo "Application URLs:"
echo "  - Frontend: http://$(curl -s ifconfig.me)"
echo "  - API: http://$(curl -s ifconfig.me)/api/v1/todos"
echo "  - Health: http://$(curl -s ifconfig.me)/health"
echo
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: docker-compose -f docker-compose.prod.yml restart"
echo "  - Stop: docker-compose -f docker-compose.prod.yml down"
echo "  - Update: ./deploy-docker.sh"
