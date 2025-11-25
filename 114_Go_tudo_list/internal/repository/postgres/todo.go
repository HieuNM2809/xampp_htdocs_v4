package postgres

import (
	"database/sql"
	"fmt"
	"time"

	"todo-app/internal/domain"

	"github.com/google/uuid"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

// TodoRepository implements the TodoRepository interface for PostgreSQL
type TodoRepository struct {
	db *sql.DB
}

// NewTodoRepository creates a new TodoRepository
func NewTodoRepository(db *sql.DB) *TodoRepository {
	return &TodoRepository{
		db: db,
	}
}

// Create creates a new todo in the database
func (r *TodoRepository) Create(todo *domain.Todo) error {
	query := `
		INSERT INTO todos (id, title, description, completed, priority, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	todo.ID = uuid.New()
	todo.CreatedAt = time.Now()
	todo.UpdatedAt = time.Now()

	_, err := r.db.Exec(query,
		todo.ID,
		todo.Title,
		todo.Description,
		todo.Completed,
		todo.Priority,
		todo.DueDate,
		todo.CreatedAt,
		todo.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create todo: %v", err)
	}

	return nil
}

// GetByID retrieves a todo by its ID
func (r *TodoRepository) GetByID(id uuid.UUID) (*domain.Todo, error) {
	query := `
		SELECT id, title, description, completed, priority, due_date, created_at, updated_at
		FROM todos
		WHERE id = $1`

	todo := &domain.Todo{}
	err := r.db.QueryRow(query, id).Scan(
		&todo.ID,
		&todo.Title,
		&todo.Description,
		&todo.Completed,
		&todo.Priority,
		&todo.DueDate,
		&todo.CreatedAt,
		&todo.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrTodoNotFound
		}
		return nil, fmt.Errorf("failed to get todo: %v", err)
	}

	return todo, nil
}

// GetAll retrieves all todos from the database
func (r *TodoRepository) GetAll() ([]*domain.Todo, error) {
	query := `
		SELECT id, title, description, completed, priority, due_date, created_at, updated_at
		FROM todos
		ORDER BY created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all todos: %v", err)
	}
	defer rows.Close()

	var todos []*domain.Todo
	for rows.Next() {
		todo := &domain.Todo{}
		err := rows.Scan(
			&todo.ID,
			&todo.Title,
			&todo.Description,
			&todo.Completed,
			&todo.Priority,
			&todo.DueDate,
			&todo.CreatedAt,
			&todo.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan todo: %v", err)
		}
		todos = append(todos, todo)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating todos: %v", err)
	}

	return todos, nil
}

// Update updates an existing todo in the database
func (r *TodoRepository) Update(todo *domain.Todo) error {
	query := `
		UPDATE todos
		SET title = $2, description = $3, completed = $4, priority = $5, due_date = $6, updated_at = $7
		WHERE id = $1`

	todo.UpdatedAt = time.Now()

	result, err := r.db.Exec(query,
		todo.ID,
		todo.Title,
		todo.Description,
		todo.Completed,
		todo.Priority,
		todo.DueDate,
		todo.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update todo: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return domain.ErrTodoNotFound
	}

	return nil
}

// Delete deletes a todo from the database
func (r *TodoRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM todos WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete todo: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return domain.ErrTodoNotFound
	}

	return nil
}

// GetByStatus retrieves todos by their completion status
func (r *TodoRepository) GetByStatus(completed bool) ([]*domain.Todo, error) {
	query := `
		SELECT id, title, description, completed, priority, due_date, created_at, updated_at
		FROM todos
		WHERE completed = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(query, completed)
	if err != nil {
		return nil, fmt.Errorf("failed to get todos by status: %v", err)
	}
	defer rows.Close()

	var todos []*domain.Todo
	for rows.Next() {
		todo := &domain.Todo{}
		err := rows.Scan(
			&todo.ID,
			&todo.Title,
			&todo.Description,
			&todo.Completed,
			&todo.Priority,
			&todo.DueDate,
			&todo.CreatedAt,
			&todo.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan todo: %v", err)
		}
		todos = append(todos, todo)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating todos: %v", err)
	}

	return todos, nil
}

// Connect creates a database connection
func Connect(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	return db, nil
}

// RunMigrations runs database migrations
func RunMigrations(db *sql.DB) error {
	// Check if the migration has already been run
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'todos'").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check if table exists: %v", err)
	}

	if count > 0 {
		// Table already exists, skip migration
		return nil
	}

	// Run the migration
	migration := `
		CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

		CREATE TABLE IF NOT EXISTS todos (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			title VARCHAR(200) NOT NULL,
			description TEXT,
			completed BOOLEAN NOT NULL DEFAULT FALSE,
			priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
			due_date TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX idx_todos_completed ON todos(completed);
		CREATE INDEX idx_todos_priority ON todos(priority);
		CREATE INDEX idx_todos_due_date ON todos(due_date);
		CREATE INDEX idx_todos_created_at ON todos(created_at);

		-- Function to automatically update the updated_at column
		CREATE OR REPLACE FUNCTION update_updated_at_column()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		-- Trigger to call the function before update
		CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
			FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
	`

	_, err = db.Exec(migration)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			return fmt.Errorf("postgres error: %s", pqErr.Message)
		}
		return fmt.Errorf("failed to run migrations: %v", err)
	}

	return nil
}
