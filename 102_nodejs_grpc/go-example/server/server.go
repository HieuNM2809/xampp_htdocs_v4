package main

import (
	"context"
	"log"
	"net"
	"sync"

	pb "go-example/proto"

	"google.golang.org/grpc"
)

type todoServer struct {
	pb.UnimplementedTodoServiceServer
	mu    sync.RWMutex
	todos map[string]*pb.TodoItem
}

func newServer() *todoServer {
	return &todoServer{
		todos: make(map[string]*pb.TodoItem),
	}
}

func (s *todoServer) CreateTodo(ctx context.Context, in *pb.TodoItem) (*pb.TodoItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Tạo ID mới và lưu todo
	in.Id = "todo_" + in.Title // Đơn giản hóa việc tạo ID
	s.todos[in.Id] = in

	log.Printf("Created todo: %v", in)
	return in, nil
}

func (s *todoServer) GetTodos(ctx context.Context, in *pb.Empty) (*pb.TodoList, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	items := make([]*pb.TodoItem, 0, len(s.todos))
	for _, item := range s.todos {
		items = append(items, item)
	}

	return &pb.TodoList{Items: items}, nil
}

func (s *todoServer) GetTodo(ctx context.Context, in *pb.TodoId) (*pb.TodoItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if todo, ok := s.todos[in.Id]; ok {
		return todo, nil
	}
	return nil, nil
}

func (s *todoServer) UpdateTodo(ctx context.Context, in *pb.TodoItem) (*pb.TodoItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.todos[in.Id]; !ok {
		return nil, nil
	}

	s.todos[in.Id] = in
	return in, nil
}

func (s *todoServer) DeleteTodo(ctx context.Context, in *pb.TodoId) (*pb.Empty, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.todos, in.Id)
	return &pb.Empty{}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterTodoServiceServer(s, newServer())

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
