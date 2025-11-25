# 🔍 Test Request Logging

## 🚀 Cách chạy và test logging

### 1. Khởi động ứng dụng
```bash
# Chạy với hot reload để thấy logs realtime
make dev
# hoặc 
.\run-windows.ps1 dev
```

### 2. Test API requests và xem logs

#### **Test CREATE TODO (POST):**
```bash
curl -X POST "http://localhost:8080/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo from Logging",
    "description": "Testing request logging functionality",
    "priority": "high"
  }'
```

**Expected Console Output:**
```
🌐 === HTTP REQUEST START ===
📍 POST /api/v1/todos
🕐 2024-01-15 10:30:45
📨 Headers:
   Content-Type: application/json
   User-Agent: curl/7.68.0
📋 Request Body:
   Raw: {"title":"Test Todo from Logging","description":"Testing request logging functionality","priority":"high"}
   Pretty JSON:
{
  "title": "Test Todo from Logging",
  "description": "Testing request logging functionality", 
  "priority": "high"
}
===============================

🚀 === CREATE TODO REQUEST ===
📍 Method: POST
📍 URL: /api/v1/todos
📍 Content-Type: application/json
📍 User-Agent: curl/7.68.0
🕐 Timestamp: 2024-01-15 10:30:45
📋 Raw Request Body: {"title":"Test Todo from Logging","description":"Testing request logging functionality","priority":"high"}
✅ Successfully Parsed Request:
   📝 Title: 'Test Todo from Logging'
   📝 Description: 'Testing request logging functionality'
   🎯 Priority: 'high'
   📅 Due Date: <nil>
🔧 Calling TodoService.CreateTodo...
✅ Todo Created Successfully!
   🆔 ID: 123e4567-e89b-12d3-a456-426614174000
   📝 Title: Test Todo from Logging
   🎯 Priority: high
   ✅ Completed: false
   📅 Created At: 2024-01-15 10:30:45
================================

✅ === HTTP RESPONSE ===
📍 POST /api/v1/todos
📊 Status: 201
⏱️  Duration: 23ms
============================
```

#### **Test GET ALL TODOS:**
```bash
curl "http://localhost:8080/api/v1/todos"
```

#### **Test with Query Parameters:**
```bash
curl "http://localhost:8080/api/v1/todos?status=pending&limit=5"
```

#### **Test Invalid Request (để thấy error logs):**
```bash
curl -X POST "http://localhost:8080/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"","priority":"invalid"}'
```

**Expected Error Log:**
```
❌ Service Error: title cannot be empty
❌ Error Type: *errors.errorString
💡 Validation Error - returning 400
================================
```

## 🎛️ Các loại logging có thể dùng

### Option 1: Full Logging (Current)
```go
router.Use(middleware.RequestLogger())
```
- ✅ Complete request/response details
- ✅ Headers, body, timing
- ❌ Verbose output

### Option 2: Simple Logging
```go
router.Use(middleware.SimpleRequestLogger())
```
- ✅ Compact format
- ✅ Less verbose
- ❌ Ít chi tiết

### Option 3: JSON Only Logging  
```go
router.Use(middleware.JSONRequestLogger())
```
- ✅ Only logs JSON API requests
- ✅ Pretty prints JSON
- ✅ Focused on API calls

### Option 4: Custom Per-Handler Logging (Current CreateTodo)
- ✅ Detailed business logic logging
- ✅ Service call tracking
- ✅ Success/error specific logs

## 🔧 Customize Logging Level

### Disable verbose logging:
```go
// In routes.go, comment out the middleware:
// router.Use(middleware.RequestLogger())
```

### Use simple logging instead:
```go
// Replace RequestLogger with SimpleRequestLogger
router.Use(middleware.SimpleRequestLogger())
```

### Environment-based logging:
```go
// Only log in development
if os.Getenv("ENV") != "production" {
    router.Use(middleware.RequestLogger())
}
```

## 📊 What You'll See in Console

### Normal Request Flow:
```
🌐 === HTTP REQUEST START ===    <- Middleware log
🚀 === CREATE TODO REQUEST ===   <- Handler specific log  
✅ Todo Created Successfully!     <- Success log
✅ === HTTP RESPONSE ===          <- Response log
```

### Error Flow:
```
🌐 === HTTP REQUEST START ===
🚀 === CREATE TODO REQUEST ===
❌ JSON Binding Error: ...       <- Parsing error
❌ === HTTP RESPONSE ===
```

### Performance Warning:
```
🐌 SLOW REQUEST WARNING: 1.2s    <- If request > 1 second
```

## 🧪 Test Different Scenarios

### Valid Request:
```bash
curl -X POST "http://localhost:8080/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"Valid Todo","priority":"medium"}'
```

### Missing Title:
```bash
curl -X POST "http://localhost:8080/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{"description":"No title provided","priority":"low"}'
```

### Invalid JSON:
```bash
curl -X POST "http://localhost:8080/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"Broken JSON",}'
```

### With Due Date:
```bash
curl -X POST "http://localhost:8080/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Todo with Due Date",
    "description": "Has deadline",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59Z"
  }'
```

## 🎯 Production Considerations

### Remove verbose logging in production:
```go
// Use build tags or environment variables
if os.Getenv("LOG_LEVEL") == "debug" {
    router.Use(middleware.RequestLogger())
}
```

### Performance impact:
- Full logging: ~2-5ms overhead per request
- Simple logging: ~0.5-1ms overhead  
- No logging: 0ms overhead

Enjoy detailed request logging! 📝✨
