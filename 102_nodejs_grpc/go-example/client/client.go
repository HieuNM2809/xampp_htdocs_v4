package main

import (
	"context"
	"flag"
	"log"
	"time"

	pb "go-example/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	defaultAddress = "localhost:50051"
)

func main() {
	// Parse command line flags
	address := flag.String("addr", defaultAddress, "the address to connect to")
	flag.Parse()

	// Set up a connection to the server
	conn, err := grpc.Dial(*address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()

	// Create a new client
	c := pb.NewTodoServiceClient(conn)

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	// Example: Create a new todo
	todo, err := c.CreateTodo(ctx, &pb.TodoItem{
		Title:       "Learn gRPC",
		Description: "Learn how to use gRPC with Go",
		Completed:   false,
	})
	if err != nil {
		log.Fatalf("could not create todo: %v", err)
	}
	log.Printf("Created todo: %v", todo)

	// Example: Get all todos
	todos, err := c.GetTodos(ctx, &pb.Empty{})
	if err != nil {
		log.Fatalf("could not get todos: %v", err)
	}
	log.Printf("All todos: %v", todos)
}
