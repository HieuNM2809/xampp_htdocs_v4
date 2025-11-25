# Todo List API

Ứng dụng Todo List RESTful API được xây dựng bằng Go và PostgreSQL với Clean Architecture.

## Tính năng

- ✅ **Frontend Web Application**: Giao diện đẹp, responsive với HTML/CSS/JavaScript
- ✅ **CRUD operations**: Tạo, đọc, cập nhật, xóa todo items 
- ✅ **Toggle completion**: Đánh dấu hoàn thành/chưa hoàn thành
- ✅ **Priority system**: Phân loại độ ưu tiên (low, medium, high)  
- ✅ **Due dates**: Thiết lập ngày hết hạn với cảnh báo quá hạn
- ✅ **Smart filtering**: Lọc theo trạng thái hoàn thành với đếm số lượng
- ✅ **Real-time updates**: Cập nhật realtime với toast notifications
- ✅ **RESTful API**: API đầy đủ với JSON responses
- ✅ **Clean Architecture**: Tách biệt rõ ràng các layer
- ✅ **PostgreSQL**: Database với migrations tự động
- ✅ **Docker support**: Container hóa cho development
- ✅ **Responsive design**: Tương thích mobile và desktop

## Cấu trúc dự án (Clean Architecture)

```
todo-app/
├── cmd/api/                    # Application entry point
│   └── main.go
├── internal/                   # Private application code
│   ├── config/                 # Configuration
│   │   └── config.go
│   ├── domain/                 # Business entities & interfaces
│   │   ├── todo.go
│   │   └── errors.go
│   ├── handler/                # HTTP handlers (Presentation layer)
│   │   ├── todo.go
│   │   └── routes.go
│   ├── repository/             # Data access layer
│   │   └── postgres/
│   │       └── todo.go
│   └── service/                # Business logic layer
│       └── todo.go
├── web/                        # Frontend web application
│   ├── index.html              # Main HTML file
│   ├── styles.css              # CSS styling
│   └── script.js               # JavaScript functionality
├── migrations/                 # Database migrations
│   ├── 001_create_todos_table.up.sql
│   └── 001_create_todos_table.down.sql
├── docker-compose.yml          # Docker services
├── Makefile                   # Build automation (Linux/macOS)
├── run-windows.ps1            # PowerShell script (Windows)
├── go.mod                     # Go module
└── README.md
```

## Yêu cầu hệ thống

- Go 1.21+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

## Cài đặt và chạy

### 1. Clone repository

```bash
git clone <your-repo-url>
cd todo-app
```

### 2. Thiết lập biến môi trường

Tạo file `.env` từ mẫu:

```bash
cp config.example.txt .env
```

Chỉnh sửa file `.env` theo cấu hình của bạn:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=todolist_db
DB_SSLMODE=disable

SERVER_HOST=localhost
SERVER_PORT=8080

JWT_SECRET=your-secret-key-here
```

### 3. Khởi động PostgreSQL

#### Option A: Sử dụng Docker (Khuyến nghị)

```bash
# Khởi động PostgreSQL
make docker-up

# Hoặc khởi động tất cả services (bao gồm pgAdmin)
make docker-up-all
```

#### Option B: PostgreSQL local

Cài đặt PostgreSQL locally và tạo database:

```sql
CREATE DATABASE todolist_db;
```

### 4. Cài đặt dependencies

```bash
make deps
```

### 5. Chạy ứng dụng

```bash
# Development
make run

# Hoặc build và chạy
make build
./bin/api
```

**Truy cập ứng dụng:**
- 🌐 **Frontend**: http://localhost:8080
- 🔗 **API**: http://localhost:8080/api/v1/todos  
- ❤️  **Health Check**: http://localhost:8080/health

## API Endpoints

### Base URL: `http://localhost:8080/api/v1`

### Health Check
- `GET /health` - Kiểm tra trạng thái API

### Todos

#### Tạo todo mới
```http
POST /api/v1/todos
Content-Type: application/json

{
  "title": "Học Go Programming",
  "description": "Hoàn thành tutorial về Clean Architecture",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z"
}
```

#### Lấy tất cả todos
```http
GET /api/v1/todos
```

#### Lọc todos theo trạng thái
```http
GET /api/v1/todos?status=completed
GET /api/v1/todos?status=pending
```

#### Lấy todo theo ID
```http
GET /api/v1/todos/{id}
```

#### Cập nhật todo
```http
PUT /api/v1/todos/{id}
Content-Type: application/json

{
  "title": "Học Go Programming - Updated",
  "description": "Hoàn thành tutorial và làm project",
  "priority": "medium",
  "completed": true
}
```

#### Toggle trạng thái hoàn thành
```http
PATCH /api/v1/todos/{id}/toggle
```

#### Xóa todo
```http
DELETE /api/v1/todos/{id}
```

## Response Format

### Success Response
```json
{
  "message": "Todo created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Học Go Programming",
    "description": "Hoàn thành tutorial về Clean Architecture",
    "completed": false,
    "priority": "high",
    "due_date": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response
```json
{
  "error": "Todo not found"
}
```

## Development Commands

### Linux/macOS (với Make):
```bash
# Setup development environment
make dev-setup

# Run application
make run

# Build application
make build

# Run tests
make test

# Start/stop Docker services
make docker-up
make docker-down

# View PostgreSQL logs
make logs

# Clean build artifacts
make clean
```

### Windows (với PowerShell):
```powershell
# Cho phép chạy PowerShell scripts (chỉ cần 1 lần)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Setup development environment
.\run-windows.ps1 dev-setup

# Run application
.\run-windows.ps1 run

# Build application  
.\run-windows.ps1 build

# Test API endpoints
.\run-windows.ps1 test-api

# Start/stop Docker services
.\run-windows.ps1 docker-up
.\run-windows.ps1 docker-down

# Open app in browser
.\run-windows.ps1 open

# View all commands
.\run-windows.ps1 help
```

## Database Management

### Sử dụng pgAdmin (nếu đã khởi động với docker-up-all)

1. Truy cập: http://localhost:5050
2. Login:
   - Email: admin@admin.com
   - Password: admin123
3. Thêm server connection:
   - Host: postgres
   - Port: 5432
   - Database: todolist_db
   - Username: postgres
   - Password: password

### Sử dụng psql

```bash
# Connect to database
docker exec -it todolist-postgres psql -U postgres -d todolist_db

# View todos table
\dt
SELECT * FROM todos;
```

## Testing API với curl

```bash
# Tạo todo mới
curl -X POST http://localhost:8080/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo",
    "description": "This is a test todo",
    "priority": "medium"
  }'

# Lấy tất cả todos
curl http://localhost:8080/api/v1/todos

# Lấy todos đã hoàn thành
curl http://localhost:8080/api/v1/todos?status=completed

# Toggle complete status (thay {id} bằng ID thực tế)
curl -X PATCH http://localhost:8080/api/v1/todos/{id}/toggle
```

## Architecture Overview

Ứng dụng tuân theo Clean Architecture principles:

1. **Domain Layer** (`internal/domain/`): Chứa business entities, interfaces và rules
2. **Service Layer** (`internal/service/`): Chứa business logic và use cases  
3. **Repository Layer** (`internal/repository/`): Chứa data access logic
4. **Handler Layer** (`internal/handler/`): Chứa HTTP handlers và presentation logic
5. **Config Layer** (`internal/config/`): Chứa configuration management

### Dependency Flow:
```
Handler -> Service -> Repository -> Database
   ↓         ↓          ↓
Domain <- Domain <- Domain
```

## Công nghệ sử dụng

- **Go 1.21**: Programming language
- **Gin**: HTTP web framework  
- **PostgreSQL**: Database
- **UUID**: Unique identifiers
- **Docker**: Containerization
- **Make**: Build automation

## Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps

# Check PostgreSQL logs
make logs

# Restart PostgreSQL
make docker-down
make docker-up
```

### Port already in use
```bash
# Check what's using port 8080
lsof -i :8080

# Change SERVER_PORT in .env file
SERVER_PORT=8081
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes  
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
