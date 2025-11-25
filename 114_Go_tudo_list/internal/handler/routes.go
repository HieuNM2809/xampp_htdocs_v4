package handler

import (
	"todo-app/internal/domain"

	"github.com/gin-gonic/gin"
)

// Router holds all handlers
type Router struct {
	todoHandler *TodoHandler
}

// NewRouter creates a new router with all handlers
func NewRouter(todoService domain.TodoService) *Router {
	return &Router{
		todoHandler: NewTodoHandler(todoService),
	}
}

// SetupRoutes sets up all API routes
func (r *Router) SetupRoutes() *gin.Engine {
	// Set Gin to release mode for production
	gin.SetMode(gin.ReleaseMode)

	router := gin.Default()

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Serve static files - specific files first
	router.StaticFile("/styles.css", "./web/styles.css")
	router.StaticFile("/script.js", "./web/script.js")
	router.StaticFile("/favicon.ico", "./web/favicon.ico")

	// Serve entire web directory for other assets
	router.Static("/assets", "./web")

	// Serve index.html for root path (must be last)
	router.StaticFile("/", "./web/index.html")

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "OK",
			"message": "Todo API is running",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		todos := v1.Group("/todos")
		{
			todos.POST("", r.todoHandler.CreateTodo)
			todos.GET("", r.todoHandler.GetAllTodos)
			todos.GET("/:id", r.todoHandler.GetTodo)
			todos.PUT("/:id", r.todoHandler.UpdateTodo)
			todos.DELETE("/:id", r.todoHandler.DeleteTodo)
			todos.PATCH("/:id/toggle", r.todoHandler.ToggleComplete)
		}
	}

	return router
}
