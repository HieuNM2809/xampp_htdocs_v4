package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"todo-app/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TodoHandler handles HTTP requests for todos
type TodoHandler struct {
	todoService domain.TodoService
}

// NewTodoHandler creates a new TodoHandler
func NewTodoHandler(todoService domain.TodoService) *TodoHandler {
	return &TodoHandler{
		todoService: todoService,
	}
}

// CreateTodo handles POST /todos
func (h *TodoHandler) CreateTodo(c *gin.Context) {
	// === LOG REQUEST INFO ===
	fmt.Printf("\n🚀 === CREATE TODO REQUEST ===\n")
	fmt.Printf("📍 Method: %s\n", c.Request.Method)
	fmt.Printf("📍 URL: %s\n", c.Request.URL.String())
	fmt.Printf("📍 Content-Type: %s\n", c.GetHeader("Content-Type"))
	fmt.Printf("📍 User-Agent: %s\n", c.GetHeader("User-Agent"))
	fmt.Printf("🕐 Timestamp: %s\n", time.Now().Format("2006-01-02 15:04:05"))

	// Log raw body (for debugging)
	if c.Request.Body != nil {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err == nil {
			fmt.Printf("📋 Raw Request Body: %s\n", string(bodyBytes))
			// Restore body for binding
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}
	}

	var req domain.CreateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// === LOG BINDING ERROR ===
		fmt.Printf("❌ JSON Binding Error: %v\n", err)
		fmt.Printf("================================\n")

		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// === LOG PARSED REQUEST DATA ===
	fmt.Printf("✅ Successfully Parsed Request:\n")
	fmt.Printf("   📝 Title: '%s'\n", req.Title)
	fmt.Printf("   📝 Description: '%s'\n", req.Description)
	fmt.Printf("   🎯 Priority: '%s'\n", req.Priority)
	if req.DueDate != nil {
		fmt.Printf("   📅 Due Date: %s\n", req.DueDate.Format("2006-01-02 15:04:05"))
	} else {
		fmt.Printf("   📅 Due Date: <nil>\n")
	}

	// === CALL SERVICE ===
	fmt.Printf("🔧 Calling TodoService.CreateTodo...\n")
	todo, err := h.todoService.CreateTodo(req.Title, req.Description, req.Priority, req.DueDate)

	if err != nil {
		// === LOG SERVICE ERROR ===
		fmt.Printf("❌ Service Error: %v\n", err)
		fmt.Printf("❌ Error Type: %T\n", err)

		if err == domain.ErrInvalidTitle || err == domain.ErrTitleTooLong ||
			err == domain.ErrDescriptionTooLong || err == domain.ErrInvalidPriority {
			fmt.Printf("💡 Validation Error - returning 400\n")
			fmt.Printf("================================\n")

			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return
		}

		fmt.Printf("💥 Internal Error - returning 500\n")
		fmt.Printf("================================\n")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create todo",
		})
		return
	}

	// === LOG SUCCESS ===
	fmt.Printf("✅ Todo Created Successfully!\n")
	fmt.Printf("   🆔 ID: %s\n", todo.ID.String())
	fmt.Printf("   📝 Title: %s\n", todo.Title)
	fmt.Printf("   🎯 Priority: %s\n", todo.Priority)
	fmt.Printf("   ✅ Completed: %t\n", todo.Completed)
	fmt.Printf("   📅 Created At: %s\n", todo.CreatedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("================================\n")

	c.JSON(http.StatusCreated, gin.H{
		"message": "Todo created successfully",
		"data":    todo.ToResponse(),
	})
}

// GetTodo handles GET /todos/:id
func (h *TodoHandler) GetTodo(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid todo ID format",
		})
		return
	}

	todo, err := h.todoService.GetTodo(id)
	if err != nil {
		if err == domain.ErrTodoNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Todo not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get todo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": todo.ToResponse(),
	})
}

// GetAllTodos handles GET /todos
func (h *TodoHandler) GetAllTodos(c *gin.Context) {
	// Check for status filter
	statusParam := c.Query("status")
	if statusParam != "" {
		if statusParam == "completed" {
			todos, err := h.todoService.GetTodosByStatus(true)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Failed to get todos",
				})
				return
			}
			h.respondWithTodos(c, todos)
			return
		} else if statusParam == "pending" {
			todos, err := h.todoService.GetTodosByStatus(false)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Failed to get todos",
				})
				return
			}
			h.respondWithTodos(c, todos)
			return
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid status parameter. Use 'completed' or 'pending'",
			})
			return
		}
	}

	todos, err := h.todoService.GetAllTodos()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get todos",
		})
		return
	}

	h.respondWithTodos(c, todos)
}

// UpdateTodo handles PUT /todos/:id
func (h *TodoHandler) UpdateTodo(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid todo ID format",
		})
		return
	}

	var req domain.UpdateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get current todo to preserve existing values
	currentTodo, err := h.todoService.GetTodo(id)
	if err != nil {
		if err == domain.ErrTodoNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Todo not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get todo",
		})
		return
	}

	// Prepare update parameters
	title := currentTodo.Title
	if req.Title != nil {
		title = *req.Title
	}

	description := currentTodo.Description
	if req.Description != nil {
		description = *req.Description
	}

	priority := currentTodo.Priority
	if req.Priority != nil {
		priority = *req.Priority
	}

	completed := currentTodo.Completed
	if req.Completed != nil {
		completed = *req.Completed
	}

	dueDate := currentTodo.DueDate
	if req.DueDate != nil {
		dueDate = req.DueDate
	}

	todo, err := h.todoService.UpdateTodo(id, title, description, priority, completed, dueDate)
	if err != nil {
		if err == domain.ErrTodoNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Todo not found",
			})
			return
		}
		if err == domain.ErrInvalidTitle || err == domain.ErrTitleTooLong ||
			err == domain.ErrDescriptionTooLong || err == domain.ErrInvalidPriority {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update todo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Todo updated successfully",
		"data":    todo.ToResponse(),
	})
}

// DeleteTodo handles DELETE /todos/:id
func (h *TodoHandler) DeleteTodo(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid todo ID format",
		})
		return
	}

	err = h.todoService.DeleteTodo(id)
	if err != nil {
		if err == domain.ErrTodoNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Todo not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete todo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Todo deleted successfully",
	})
}

// ToggleComplete handles PATCH /todos/:id/toggle
func (h *TodoHandler) ToggleComplete(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid todo ID format",
		})
		return
	}

	todo, err := h.todoService.ToggleComplete(id)
	if err != nil {
		if err == domain.ErrTodoNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Todo not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to toggle todo completion",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Todo completion status toggled successfully",
		"data":    todo.ToResponse(),
	})
}

// respondWithTodos is a helper function to respond with a list of todos
func (h *TodoHandler) respondWithTodos(c *gin.Context, todos []*domain.Todo) {
	responses := make([]*domain.TodoResponse, len(todos))
	for i, todo := range todos {
		responses[i] = todo.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  responses,
		"count": len(responses),
	})
}
