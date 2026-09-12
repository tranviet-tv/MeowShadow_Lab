// Package repository defines repository interfaces and implementations for database operations.
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/repository/db"
)

// UserRepository specifies persistence operations for user accounts and devices.
type UserRepository interface {
	CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error)
	GetUserByEmail(ctx context.Context, email string) (*db.User, error)
	GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error)
}

type pgxUserRepository struct {
	queries *db.Queries
}

// NewUserRepository constructs a new UserRepository instance using sqlc Queries.
func NewUserRepository(queries *db.Queries) UserRepository {
	return &pgxUserRepository{
		queries: queries,
	}
}

func (r *pgxUserRepository) CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error) {
	fnText := pgtype.Text{String: fullName, Valid: fullName != ""}
	res, err := r.queries.CreateUser(ctx, db.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		FullName:     fnText,
	})
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *pgxUserRepository) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	u, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *pgxUserRepository) GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error) {
	u, err := r.queries.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
