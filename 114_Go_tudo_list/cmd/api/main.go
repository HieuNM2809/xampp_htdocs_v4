package main

import (
	"log"

	"todo-app/internal/config"
	"todo-app/internal/handler"
	"todo-app/internal/repository/postgres"
	"todo-app/internal/service"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := postgres.Connect(cfg.Database.GetDSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := postgres.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repository
	todoRepo := postgres.NewTodoRepository(db)

	// Initialize service
	todoService := service.NewTodoService(todoRepo)

	// Initialize router
	router := handler.NewRouter(todoService)
	r := router.SetupRoutes()

	// Start server
	serverAddr := cfg.Server.GetServerAddr()
	log.Printf("Starting server on %s", serverAddr)
	log.Printf("Health check: http://%s/health", serverAddr)
	log.Printf("API docs: http://%s/api/v1/todos", serverAddr)

	if err := r.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
