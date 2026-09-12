// Package services contains business logic and background operational tasks.
package services

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// CleanupConfig defines parameters for storage retention scanning.
type CleanupConfig struct {
	StorageDir        string
	RetentionDuration time.Duration
	DryRun            bool
}

// CleanupMetrics aggregates statistics from a cleanup execution run.
type CleanupMetrics struct {
	ScannedFiles   int           `json:"scanned_files"`
	DeletedFiles   int           `json:"deleted_files"`
	ReclaimedBytes int64         `json:"reclaimed_bytes"`
	Duration       time.Duration `json:"duration"`
	Errors         []string      `json:"errors,omitempty"`
}

// StorageCleanupService defines operations for purging expired temporary files.
type StorageCleanupService interface {
	CleanupTempFiles(ctx context.Context) (*CleanupMetrics, error)
	StartScheduler(ctx context.Context, interval time.Duration)
}

type storageCleanupService struct {
	cfg CleanupConfig
	mu  sync.Mutex
}

// NewStorageCleanupService constructs a new StorageCleanupService.
func NewStorageCleanupService(cfg CleanupConfig) StorageCleanupService {
	if cfg.StorageDir == "" {
		cfg.StorageDir = "./storage"
	}
	if cfg.RetentionDuration <= 0 {
		cfg.RetentionDuration = 24 * time.Hour
	}
	return &storageCleanupService{
		cfg: cfg,
	}
}

// CleanupTempFiles scans the storage temp/ directory and purges files older than the retention threshold.
func (s *storageCleanupService) CleanupTempFiles(ctx context.Context) (*CleanupMetrics, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	startTime := time.Now()
	metrics := &CleanupMetrics{
		Errors: make([]string, 0),
	}

	tempDir := filepath.Join(s.cfg.StorageDir, "temp")
	if _, err := os.Stat(tempDir); os.IsNotExist(err) {
		metrics.Duration = time.Since(startTime)
		return metrics, nil
	}

	cutoff := time.Now().Add(-s.cfg.RetentionDuration)

	err := filepath.WalkDir(tempDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			metrics.Errors = append(metrics.Errors, fmt.Sprintf("error accessing %s: %v", path, walkErr))
			return nil
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Skip the root temp folder itself
		if path == tempDir || d.IsDir() {
			return nil
		}

		metrics.ScannedFiles++

		info, err := d.Info()
		if err != nil {
			metrics.Errors = append(metrics.Errors, fmt.Sprintf("cannot read stat for %s: %v", path, err))
			return nil
		}

		// Check if file modification time is older than the retention cutoff
		if info.ModTime().Before(cutoff) {
			fileSize := info.Size()

			if !s.cfg.DryRun {
				if removeErr := os.Remove(path); removeErr != nil {
					metrics.Errors = append(metrics.Errors, fmt.Sprintf("failed to delete %s: %v", path, removeErr))
					return nil
				}
			}

			metrics.DeletedFiles++
			metrics.ReclaimedBytes += fileSize
		}

		return nil
	})

	metrics.Duration = time.Since(startTime)
	if err != nil && !os.IsNotExist(err) {
		return metrics, err
	}

	return metrics, nil
}

// StartScheduler launches a recurring background worker polling for expired files.
func (s *storageCleanupService) StartScheduler(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 1 * time.Hour
	}

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("Storage cleanup scheduler stopped.")
				return
			case <-ticker.C:
				metrics, err := s.CleanupTempFiles(ctx)
				if err != nil {
					log.Printf("Storage cleanup error: %v", err)
				} else if metrics.DeletedFiles > 0 {
					log.Printf("Storage cleanup completed: removed %d expired files, reclaimed %d bytes in %v",
						metrics.DeletedFiles, metrics.ReclaimedBytes, metrics.Duration)
				}
			}
		}
	}()
}
