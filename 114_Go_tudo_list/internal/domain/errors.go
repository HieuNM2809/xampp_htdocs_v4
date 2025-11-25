package domain

import "errors"

var (
	// ErrTodoNotFound is returned when a todo is not found
	ErrTodoNotFound = errors.New("todo not found")

	// ErrInvalidTitle is returned when the title is invalid
	ErrInvalidTitle = errors.New("title cannot be empty")

	// ErrTitleTooLong is returned when the title is too long
	ErrTitleTooLong = errors.New("title cannot be longer than 200 characters")

	// ErrDescriptionTooLong is returned when the description is too long
	ErrDescriptionTooLong = errors.New("description cannot be longer than 1000 characters")

	// ErrInvalidPriority is returned when the priority is invalid
	ErrInvalidPriority = errors.New("priority must be one of: low, medium, high")

	// ErrInvalidID is returned when the ID is invalid
	ErrInvalidID = errors.New("invalid ID format")
)
