#!/bin/bash

# Tạo thư mục proto nếu chưa tồn tại
mkdir -p proto

# Generate Go code từ proto file
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/todo.proto
