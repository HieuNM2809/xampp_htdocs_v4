# winget install ezwinports.make

.PHONY: help build run dev test clean docker-up docker-down migrate install-air

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install-air    - Install Air (hot reload tool)"
	@echo "  dev-setup      - Setup development environment"
	@echo "  deps          - Download dependencies"
	@echo ""
	@echo "Development:"
	@echo "  dev           - 🔥 Run with hot reload (recommended)"
	@echo "  run           - Run normally"
	@echo "  build         - Build the application"
	@echo "  test          - Run tests"
	@echo "  clean         - Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up     - Start PostgreSQL with Docker Compose"
	@echo "  docker-down   - Stop Docker Compose services"
	@echo "  logs          - Show PostgreSQL logs"
	@echo ""
	@echo "🔥 Hot Reload Workflow:"
	@echo "1. make dev-setup"
	@echo "2. make dev           # Hot reload mode!"
	@echo "3. Edit code -> Auto restart! 🚀"

# Install Air for hot reload
install-air:
	@echo "📦 Installing Air (Hot Reload tool)..."
ifeq ($(OS),Windows_NT)
	@powershell -Command "if (-not (Get-Command air -ErrorAction SilentlyContinue)) { go install github.com/air-verse/air@latest }"
else
	@command -v air >/dev/null 2>&1 || go install github.com/air-verse/air@latest
endif
	@echo "✅ Air installed successfully!"

# Run with hot reload
dev:
ifeq ($(OS),Windows_NT)
	@powershell -Command "if (-not (Get-Command air -ErrorAction SilentlyContinue)) { Write-Host '❌ Air is not installed! Run: make install-air' -ForegroundColor Red; exit 1 }"
else
	@command -v air >/dev/null 2>&1 || { echo "❌ Air is not installed! Run: make install-air"; exit 1; }
endif
	@echo "🔥 Starting with Hot Reload (Air)..."
	@echo "📱 Frontend: http://localhost:8080"
	@echo "🔗 API: http://localhost:8080/api/v1/todos"
	@echo "❤️  Health: http://localhost:8080/health"
	@echo "🔄 Auto-reloading on file changes..."
	@echo ""
	air

# Build the application
build:
	@echo "Building the application..."
	go build -o bin/api cmd/api/main.go

# Run the application (normal mode)
run:
	@echo "🚀 Running the application (normal mode)..."
	@echo "📱 Frontend: http://localhost:8080"
	@echo "🔗 API: http://localhost:8080/api/v1/todos"
	@echo "❤️  Health: http://localhost:8080/health"
	@echo "💡 Tip: Use 'make dev' for hot reload mode!"
	@echo ""
	go run cmd/api/main.go

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	rm -rf bin/ tmp/
	go clean
	@echo "✅ Clean completed!"

# Start PostgreSQL with Docker Compose
docker-up:
	@echo "Starting PostgreSQL..."
	docker-compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
ifeq ($(OS),Windows_NT)
	@powershell -Command "Start-Sleep -Seconds 5"
else
	@sleep
endif
	@echo "PostgreSQL is ready!"

# Start all services including pgAdmin
docker-up-all:
	@echo "Starting all services..."
	docker-compose up -d
	@echo "Services are running:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgAdmin: http://localhost:5050"

# Stop Docker Compose services
docker-down:
	@echo "Stopping services..."
	docker-compose down

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy

# Development setup with hot reload
dev-setup: docker-up deps install-air
	@echo "✅ Development environment is ready!"
	@echo "Hot reload mode: make dev"
	@echo "Normal mode: make run"

# Show logs
logs:
	docker-compose logs -f postgres
