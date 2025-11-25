# Todo List Application - Windows PowerShell Script with Hot Reload
# Thay thế cho Makefile trên Windows

param(
    [Parameter(Mandatory=$true)]
    [string]$Action
)

function Write-ColorOutput($ForegroundColor, $Text) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Text
    $host.UI.RawUI.ForegroundColor = $fc
}

function Test-AirInstalled {
    try {
        $null = Get-Command air -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

switch ($Action) {
    "install-air" {
        Write-ColorOutput Green "📦 Installing Air (Hot Reload tool)..."
        Write-ColorOutput Yellow "Installing via Go install..."
        go install github.com/air-verse/air@latest
        
        if (Test-AirInstalled) {
            Write-ColorOutput Green "✅ Air installed successfully!"
            Write-ColorOutput Cyan "You can now use: .\run-windows.ps1 dev"
        } else {
            Write-ColorOutput Red "❌ Air installation failed. Please make sure Go is in PATH."
            Write-ColorOutput Yellow "Alternative: Download from https://github.com/air-verse/air/releases"
        }
    }
    
    "docker-up" {
        Write-ColorOutput Green "🚀 Starting PostgreSQL..."
        docker-compose up -d postgres
        Write-ColorOutput Yellow "⏳ Waiting for PostgreSQL to be ready..."
        Start-Sleep -Seconds 5
        Write-ColorOutput Green "✅ PostgreSQL is ready!"
    }
    
    "docker-up-all" {
        Write-ColorOutput Green "🚀 Starting all services..."
        docker-compose up -d
        Write-ColorOutput Green "✅ Services are running:"
        Write-ColorOutput Cyan "  📊 PostgreSQL: localhost:5432"
        Write-ColorOutput Cyan "  🌐 pgAdmin: http://localhost:5050"
    }
    
    "docker-down" {
        Write-ColorOutput Yellow "🛑 Stopping services..."
        docker-compose down
        Write-ColorOutput Green "✅ Services stopped!"
    }
    
    "deps" {
        Write-ColorOutput Green "📦 Downloading dependencies..."
        go mod download
        go mod tidy
        Write-ColorOutput Green "✅ Dependencies installed!"
    }
    
    "build" {
        Write-ColorOutput Green "🔨 Building the application..."
        go build -o bin/api.exe cmd/api/main.go
        Write-ColorOutput Green "✅ Build completed!"
    }
    
    "run" {
        Write-ColorOutput Green "🚀 Running the application (normal mode)..."
        Write-ColorOutput Cyan "📱 Frontend: http://localhost:8080"
        Write-ColorOutput Cyan "🔗 API: http://localhost:8080/api/v1/todos"
        Write-ColorOutput Cyan "❤️  Health: http://localhost:8080/health"
        Write-ColorOutput Yellow "💡 Tip: Use 'dev' for hot reload mode!"
        Write-Output ""
        go run cmd/api/main.go
    }
    
    "dev" {
        if (-not (Test-AirInstalled)) {
            Write-ColorOutput Red "❌ Air is not installed!"
            Write-ColorOutput Yellow "Please install Air first:"
            Write-ColorOutput Cyan ".\run-windows.ps1 install-air"
            return
        }
        
        Write-ColorOutput Green "🔥 Starting with Hot Reload (Air)..."
        Write-ColorOutput Cyan "📱 Frontend: http://localhost:8080"
        Write-ColorOutput Cyan "🔗 API: http://localhost:8080/api/v1/todos"
        Write-ColorOutput Cyan "❤️  Health: http://localhost:8080/health"
        Write-ColorOutput Yellow "🔄 Auto-reloading on file changes..."
        Write-Output ""
        air
    }
    
    "test" {
        Write-ColorOutput Green "🧪 Running tests..."
        go test -v ./...
    }
    
    "clean" {
        Write-ColorOutput Green "🧹 Cleaning..."
        if (Test-Path "bin") {
            Remove-Item -Recurse -Force bin
        }
        if (Test-Path "tmp") {
            Remove-Item -Recurse -Force tmp
        }
        go clean
        Write-ColorOutput Green "✅ Clean completed!"
    }
    
    "logs" {
        Write-ColorOutput Green "📋 Showing PostgreSQL logs..."
        docker-compose logs -f postgres
    }
    
    "dev-setup" {
        Write-ColorOutput Green "🛠️  Setting up development environment..."
        & $PSCommandPath docker-up
        & $PSCommandPath deps
        
        if (-not (Test-AirInstalled)) {
            Write-ColorOutput Yellow "⚡ Installing Air for hot reload..."
            & $PSCommandPath install-air
        }
        
        Write-ColorOutput Green "✅ Development environment is ready!"
        Write-ColorOutput Cyan "Hot reload mode: .\run-windows.ps1 dev"
        Write-ColorOutput Cyan "Normal mode: .\run-windows.ps1 run"
    }
    
    "test-api" {
        Write-ColorOutput Green "🧪 Testing API endpoints..."
        Write-ColorOutput Yellow "Make sure the server is running first!"
        Write-Output ""
        
        # Health check
        Write-ColorOutput Cyan "1. Testing health check..."
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
            Write-ColorOutput Green "✅ Health check passed: $($response.message)"
        } catch {
            Write-ColorOutput Red "❌ Health check failed: $($_.Exception.Message)"
        }
        
        # Create todo
        Write-ColorOutput Cyan "2. Creating a test todo..."
        $todoData = @{
            title = "Test Hot Reload"
            description = "Todo để test hot reload functionality"
            priority = "high"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/todos" -Method POST -ContentType "application/json" -Body $todoData
            $todoId = $response.data.id
            Write-ColorOutput Green "✅ Todo created with ID: $todoId"
        } catch {
            Write-ColorOutput Red "❌ Failed to create todo: $($_.Exception.Message)"
            return
        }
        
        # Get all todos
        Write-ColorOutput Cyan "3. Getting all todos..."
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/todos" -Method GET
            Write-ColorOutput Green "✅ Found $($response.count) todos"
        } catch {
            Write-ColorOutput Red "❌ Failed to get todos: $($_.Exception.Message)"
        }
        
        # Toggle todo
        Write-ColorOutput Cyan "4. Toggling todo completion..."
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/todos/$todoId/toggle" -Method PATCH
            Write-ColorOutput Green "✅ Todo toggled successfully"
        } catch {
            Write-ColorOutput Red "❌ Failed to toggle todo: $($_.Exception.Message)"
        }
        
        # Delete todo
        Write-ColorOutput Cyan "5. Deleting test todo..."
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/todos/$todoId" -Method DELETE
            Write-ColorOutput Green "✅ Todo deleted successfully"
        } catch {
            Write-ColorOutput Red "❌ Failed to delete todo: $($_.Exception.Message)"
        }
        
        Write-ColorOutput Green "🎉 API testing completed!"
    }
    
    "open" {
        Write-ColorOutput Green "🌐 Opening application in browser..."
        Start-Process "http://localhost:8080"
    }
    
    "status" {
        Write-ColorOutput Green "📊 Checking application status..."
        
        # Check if Air is installed
        if (Test-AirInstalled) {
            Write-ColorOutput Green "✅ Air (hot reload) is installed"
        } else {
            Write-ColorOutput Yellow "⚠️  Air not installed - run: .\run-windows.ps1 install-air"
        }
        
        # Check if Docker is running
        Write-ColorOutput Cyan "Docker containers:"
        try {
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        } catch {
            Write-ColorOutput Red "❌ Docker is not running"
        }
        
        Write-Output ""
        
        # Check if Go app is running
        Write-ColorOutput Cyan "Testing API health:"
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
            Write-ColorOutput Green "✅ API is running: $($response.message)"
        } catch {
            Write-ColorOutput Red "❌ API is not running"
        }
    }
    
    "help" {
        Write-ColorOutput Green "📋 Available commands:"
        Write-Output ""
        Write-ColorOutput Cyan "Setup & Installation:"
        Write-ColorOutput Yellow "  install-air    - Install Air (hot reload tool)"
        Write-ColorOutput Yellow "  dev-setup      - Setup development environment"
        Write-ColorOutput Yellow "  deps           - Download Go dependencies"
        Write-Output ""
        Write-ColorOutput Cyan "Docker:"
        Write-ColorOutput Yellow "  docker-up      - Start PostgreSQL"
        Write-ColorOutput Yellow "  docker-up-all  - Start all services (PostgreSQL + pgAdmin)"
        Write-ColorOutput Yellow "  docker-down    - Stop all services"
        Write-ColorOutput Yellow "  logs           - Show PostgreSQL logs"
        Write-Output ""
        Write-ColorOutput Cyan "Development:"
        Write-ColorOutput Yellow "  dev            - 🔥 Run with hot reload (recommended)"
        Write-ColorOutput Yellow "  run            - Run normally"
        Write-ColorOutput Yellow "  build          - Build application"
        Write-ColorOutput Yellow "  test           - Run tests"
        Write-ColorOutput Yellow "  clean          - Clean build artifacts"
        Write-Output ""
        Write-ColorOutput Cyan "Testing & Utilities:"
        Write-ColorOutput Yellow "  test-api       - Test API endpoints"
        Write-ColorOutput Yellow "  open           - Open app in browser"
        Write-ColorOutput Yellow "  status         - Check system status"
        Write-ColorOutput Yellow "  help           - Show this help"
        Write-Output ""
        Write-ColorOutput Green "🔥 Hot Reload Workflow:"
        Write-ColorOutput Cyan "1. .\run-windows.ps1 dev-setup"
        Write-ColorOutput Cyan "2. .\run-windows.ps1 dev           # Hot reload mode!"
        Write-ColorOutput Cyan "3. .\run-windows.ps1 open"
        Write-ColorOutput Cyan "4. Edit code -> Auto restart! 🚀"
        Write-Output ""
        Write-ColorOutput Green "📝 Hot Reload Features:"
        Write-ColorOutput Yellow "• Auto restart on .go file changes"
        Write-ColorOutput Yellow "• Clear screen on rebuild"
        Write-ColorOutput Yellow "• Build error logging"
        Write-ColorOutput Yellow "• Fast incremental builds"
    }
    
    default {
        Write-ColorOutput Red "❌ Unknown action: $Action"
        Write-ColorOutput Yellow "Run '.\run-windows.ps1 help' to see available commands"
    }
}
