# Go gRPC Example

Đây là một ví dụ về cách sử dụng gRPC với Go.

## Cấu trúc dự án

```
go-example/
├── proto/           # Thư mục chứa file proto
│   └── todo.proto   # Định nghĩa service và message
├── server/          # Thư mục chứa code server
│   └── server.go    # Triển khai gRPC server
├── client/          # Thư mục chứa code client
│   └── client.go    # Triển khai gRPC client
├── go.mod           # File quản lý dependencies
└── README.md        # File hướng dẫn
```

## Yêu cầu

- Go 1.21 trở lên
- Protocol Buffers Compiler (protoc)
- Go plugins cho protoc:
  ```bash
  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
  go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
  ```

## Cài đặt

1. Cài đặt các dependencies:
   ```bash
   go mod tidy
   ```

2. Generate code từ proto file:
   ```bash
   ./generate_proto.sh
   ```

## Chạy ứng dụng

1. Chạy server:
   ```bash
   go run server/server.go
   ```

2. Chạy client (trong terminal khác):
   ```bash
   go run client/client.go
   ```

## API Endpoints

1. CreateTodo
   - Input: TodoItem (title, description, completed)
   - Output: TodoItem (với ID được tạo)

2. GetTodos
   - Input: Empty
   - Output: TodoList (danh sách các TodoItem)

3. GetTodo
   - Input: TodoId
   - Output: TodoItem

4. UpdateTodo
   - Input: TodoItem
   - Output: TodoItem đã cập nhật

5. DeleteTodo
   - Input: TodoId
   - Output: Empty

## Ví dụ sử dụng

1. Tạo todo mới:
   ```go
   todo, err := client.CreateTodo(ctx, &pb.TodoItem{
       Title:       "Learn gRPC",
       Description: "Learn how to use gRPC with Go",
       Completed:   false,
   })
   ```

2. Lấy danh sách todos:
   ```go
   todos, err := client.GetTodos(ctx, &pb.Empty{})
   ```

3. Lấy todo theo ID:
   ```go
   todo, err := client.GetTodo(ctx, &pb.TodoId{Id: "todo_1"})
   ```

4. Cập nhật todo:
   ```go
   updatedTodo, err := client.UpdateTodo(ctx, &pb.TodoItem{
       Id:          "todo_1",
       Title:       "Updated Title",
       Description: "Updated Description",
       Completed:   true,
   })
   ```

5. Xóa todo:
   ```go
   _, err := client.DeleteTodo(ctx, &pb.TodoId{Id: "todo_1"})
   ```
