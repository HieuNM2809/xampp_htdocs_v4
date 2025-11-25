# winget install ezwinports.make

.PHONY: help build run test clean docker-up docker-down migrate

# Default target
help:
	@echo "Available commands:"
	@echo "  build      - Build the application"
	@echo "  run        - Run the application"
	@echo "  test       - Run tests"
	@echo "  clean      - Clean build artifacts"
	@echo "  docker-up  - Start PostgreSQL with Docker Compose"
	@echo "  docker-down- Stop Docker Compose services"
	@echo "  deps       - Download dependencies"

# Build the application
build:
	@echo "Building the application..."
	go build -o bin/api cmd/api/main.go

# Run the application
run:
	@echo "Running the application..."
	go run cmd/api/main.go

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	go clean

# Start PostgreSQL with Docker Compose
docker-up:
	@echo "Starting PostgreSQL..."
	docker-compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
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

# Development setup
dev-setup: docker-up deps
	@echo "Development environment is ready!"
	@echo "You can now run: make run"

# Show logs
logs:
	docker-compose logs -f postgres
