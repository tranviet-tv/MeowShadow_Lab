// Package postgres manages PostgreSQL connections and connection pools using pgx/v5.
package postgres

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool initializes and validates a high-performance pgxpool connection pool.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database url: %w", err)
	}

	// Performance and connection resilience tuning
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 15 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Ping database to ensure immediate connectivity
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		log.Printf("Warning: initial PostgreSQL ping failed: %v", err)
		// We return the pool anyway so service can start and reconnect when DB is ready
	} else {
		log.Println("PostgreSQL connection pool established successfully.")
	}

	return pool, nil
}
