#!/bin/bash

# Todo List API Test Script
# This script tests all the main endpoints of the Todo API

API_BASE="http://localhost:8080/api/v1"
HEALTH_URL="http://localhost:8080/health"

echo "🚀 Testing Todo List API..."
echo "================================"

# Test health check
echo "1. Testing health check..."
curl -s "$HEALTH_URL" | jq . || echo "Health check failed"
echo ""

# Test creating a todo
echo "2. Creating a new todo..."
TODO_RESPONSE=$(curl -s -X POST "$API_BASE/todos" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo từ script",
    "description": "Đây là todo test từ bash script",
    "priority": "high"
  }')

echo "$TODO_RESPONSE" | jq . || echo "Create todo failed"

# Extract todo ID from response
TODO_ID=$(echo "$TODO_RESPONSE" | jq -r '.data.id')
echo "Todo ID: $TODO_ID"
echo ""

# Test getting all todos
echo "3. Getting all todos..."
curl -s "$API_BASE/todos" | jq . || echo "Get all todos failed"
echo ""

# Test getting a specific todo
echo "4. Getting specific todo..."
curl -s "$API_BASE/todos/$TODO_ID" | jq . || echo "Get specific todo failed"
echo ""

# Test updating the todo
echo "5. Updating todo..."
curl -s -X PUT "$API_BASE/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Test Todo",
    "description": "Đã update từ script",
    "priority": "medium",
    "completed": true
  }' | jq . || echo "Update todo failed"
echo ""

# Test toggle complete status
echo "6. Toggling completion status..."
curl -s -X PATCH "$API_BASE/todos/$TODO_ID/toggle" | jq . || echo "Toggle failed"
echo ""

# Test getting completed todos
echo "7. Getting completed todos..."
curl -s "$API_BASE/todos?status=completed" | jq . || echo "Get completed todos failed"
echo ""

# Test getting pending todos
echo "8. Getting pending todos..."
curl -s "$API_BASE/todos?status=pending" | jq . || echo "Get pending todos failed"
echo ""

# Test deleting the todo
echo "9. Deleting todo..."
curl -s -X DELETE "$API_BASE/todos/$TODO_ID" | jq . || echo "Delete todo failed"
echo ""

# Verify deletion
echo "10. Verifying deletion (should return 404)..."
curl -s "$API_BASE/todos/$TODO_ID" | jq . || echo "Todo was successfully deleted"
echo ""

echo "✅ API testing completed!"
echo ""
echo "Để chạy script này:"
echo "1. Cài đặt jq: sudo apt-get install jq (Linux) hoặc brew install jq (Mac)"  
echo "2. Khởi động API server: make run"
echo "3. Chạy script: chmod +x test_api.sh && ./test_api.sh"
