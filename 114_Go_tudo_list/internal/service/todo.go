package service

import (
	"time"

	"github.com/google/uuid"
	"todo-app/internal/domain"
)

// TodoService implements the TodoService interface
type TodoService struct {
	todoRepo domain.TodoRepository
}

// NewTodoService creates a new TodoService
func NewTodoService(todoRepo domain.TodoRepository) *TodoService {
	return &TodoService{
		todoRepo: todoRepo,
	}
}

// CreateTodo creates a new todo item
func (s *TodoService) CreateTodo(title, description, priority string, dueDate *time.Time) (*domain.Todo, error) {
	// Set default priority if not provided
	if priority == "" {
		priority = "medium"
	}

	// Create the todo
	todo := &domain.Todo{
		Title:       title,
		Description: description,
		Completed:   false,
		Priority:    priority,
		DueDate:     dueDate,
	}

	// Validate the todo
	if err := todo.Validate(); err != nil {
		return nil, err
	}

	// Save to repository
	if err := s.todoRepo.Create(todo); err != nil {
		return nil, err
	}

	return todo, nil
}

// GetTodo retrieves a todo by its ID
func (s *TodoService) GetTodo(id uuid.UUID) (*domain.Todo, error) {
	return s.todoRepo.GetByID(id)
}

// GetAllTodos retrieves all todo items
func (s *TodoService) GetAllTodos() ([]*domain.Todo, error) {
	return s.todoRepo.GetAll()
}

// UpdateTodo updates an existing todo item
func (s *TodoService) UpdateTodo(id uuid.UUID, title, description, priority string, completed bool, dueDate *time.Time) (*domain.Todo, error) {
	// Get the existing todo
	todo, err := s.todoRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if title != "" {
		todo.Title = title
	}
	if description != "" {
		todo.Description = description
	}
	if priority != "" {
		todo.Priority = priority
	}
	todo.Completed = completed
	if dueDate != nil {
		todo.DueDate = dueDate
	}

	// Validate the updated todo
	if err := todo.Validate(); err != nil {
		return nil, err
	}

	// Update in repository
	if err := s.todoRepo.Update(todo); err != nil {
		return nil, err
	}

	return todo, nil
}

// DeleteTodo deletes a todo item
func (s *TodoService) DeleteTodo(id uuid.UUID) error {
	return s.todoRepo.Delete(id)
}

// GetTodosByStatus retrieves todos filtered by completion status
func (s *TodoService) GetTodosByStatus(completed bool) ([]*domain.Todo, error) {
	return s.todoRepo.GetByStatus(completed)
}

// ToggleComplete toggles the completion status of a todo
func (s *TodoService) ToggleComplete(id uuid.UUID) (*domain.Todo, error) {
	// Get the existing todo
	todo, err := s.todoRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Toggle the completed status
	todo.Completed = !todo.Completed

	// Update in repository
	if err := s.todoRepo.Update(todo); err != nil {
		return nil, err
	}

	return todo, nil
}
