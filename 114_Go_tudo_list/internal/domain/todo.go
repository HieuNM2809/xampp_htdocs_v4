package domain

import (
	"time"

	"github.com/google/uuid"
)

// Todo represents a todo item domain model
type Todo struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Title       string     `json:"title" db:"title"`
	Description string     `json:"description" db:"description"`
	Completed   bool       `json:"completed" db:"completed"`
	Priority    string     `json:"priority" db:"priority"`
	DueDate     *time.Time `json:"due_date" db:"due_date"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// TodoRepository defines the interface for todo data access
type TodoRepository interface {
	Create(todo *Todo) error
	GetByID(id uuid.UUID) (*Todo, error)
	GetAll() ([]*Todo, error)
	Update(todo *Todo) error
	Delete(id uuid.UUID) error
	GetByStatus(completed bool) ([]*Todo, error)
}

// TodoService defines the interface for todo business logic
type TodoService interface {
	CreateTodo(title, description, priority string, dueDate *time.Time) (*Todo, error)
	GetTodo(id uuid.UUID) (*Todo, error)
	GetAllTodos() ([]*Todo, error)
	UpdateTodo(id uuid.UUID, title, description, priority string, completed bool, dueDate *time.Time) (*Todo, error)
	DeleteTodo(id uuid.UUID) error
	GetTodosByStatus(completed bool) ([]*Todo, error)
	ToggleComplete(id uuid.UUID) (*Todo, error)
}

// CreateTodoRequest represents the request to create a new todo
type CreateTodoRequest struct {
	Title       string     `json:"title" binding:"required,min=1,max=200"`
	Description string     `json:"description" binding:"max=1000"`
	Priority    string     `json:"priority" binding:"omitempty,oneof=low medium high"`
	DueDate     *time.Time `json:"due_date"`
}

// UpdateTodoRequest represents the request to update a todo
type UpdateTodoRequest struct {
	Title       *string    `json:"title" binding:"omitempty,min=1,max=200"`
	Description *string    `json:"description" binding:"omitempty,max=1000"`
	Priority    *string    `json:"priority" binding:"omitempty,oneof=low medium high"`
	Completed   *bool      `json:"completed"`
	DueDate     *time.Time `json:"due_date"`
}

// TodoResponse represents the response format for todo
type TodoResponse struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Completed   bool       `json:"completed"`
	Priority    string     `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ToResponse converts Todo domain model to response format
func (t *Todo) ToResponse() *TodoResponse {
	return &TodoResponse{
		ID:          t.ID.String(),
		Title:       t.Title,
		Description: t.Description,
		Completed:   t.Completed,
		Priority:    t.Priority,
		DueDate:     t.DueDate,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// Validate validates the todo domain model
func (t *Todo) Validate() error {
	if t.Title == "" {
		return ErrInvalidTitle
	}
	if len(t.Title) > 200 {
		return ErrTitleTooLong
	}
	if len(t.Description) > 1000 {
		return ErrDescriptionTooLong
	}
	if t.Priority != "" && t.Priority != "low" && t.Priority != "medium" && t.Priority != "high" {
		return ErrInvalidPriority
	}
	return nil
}
