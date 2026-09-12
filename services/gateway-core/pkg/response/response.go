// Package response provides standardized JSON response structures and helpers for API handlers.
package response

import (
	"math"

	"github.com/gofiber/fiber/v2"
)

// Response represents the standard API response structure.
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// PaginationMeta contains metadata for paginated query results.
type PaginationMeta struct {
	CurrentPage int64 `json:"current_page"`
	TotalPages  int64 `json:"total_pages"`
	TotalItems  int64 `json:"total_items"`
	PageSize    int64 `json:"page_size"`
}

// PaginatedResponse represents the standard response structure for paginated lists.
type PaginatedResponse struct {
	Success    bool           `json:"success"`
	Message    string         `json:"message"`
	Data       interface{}    `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}

// Success sends a standardized success JSON response.
func Success(c *fiber.Ctx, statusCode int, message string, data interface{}) error {
	return c.Status(statusCode).JSON(Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Error sends a standardized error JSON response.
func Error(c *fiber.Ctx, statusCode int, message string, errDetails interface{}) error {
	return c.Status(statusCode).JSON(Response{
		Success: false,
		Message: message,
		Error:   errDetails,
	})
}

// Paginated sends a standardized paginated list response.
func Paginated(c *fiber.Ctx, statusCode int, message string, data interface{}, page, limit, total int64) error {
	totalPages := int64(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 && total == 0 {
		totalPages = 1
	}

	return c.Status(statusCode).JSON(PaginatedResponse{
		Success: true,
		Message: message,
		Data:    data,
		Pagination: PaginationMeta{
			CurrentPage: page,
			TotalPages:  totalPages,
			TotalItems:  total,
			PageSize:    limit,
		},
	})
}
