package services_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"meowshadow/gateway-core/internal/services"
)

func TestStorageCleanupService_PurgeExpiredFiles(t *testing.T) {
	tempRoot := t.TempDir()
	tempDir := filepath.Join(tempRoot, "temp")
	_ = os.MkdirAll(tempDir, 0755)

	// 1. Create an expired file (mod time 48 hours ago)
	expiredFilePath := filepath.Join(tempDir, "expired_render_clip_1.wav")
	dummyData := []byte("dummy audio wave data of 100 bytes length for expiration test")
	_ = os.WriteFile(expiredFilePath, dummyData, 0644)
	oldTime := time.Now().Add(-48 * time.Hour)
	_ = os.Chtimes(expiredFilePath, oldTime, oldTime)

	// 2. Create an active recent file (mod time 10 minutes ago)
	recentFilePath := filepath.Join(tempDir, "recent_render_clip_2.wav")
	_ = os.WriteFile(recentFilePath, dummyData, 0644)
	recentTime := time.Now().Add(-10 * time.Minute)
	_ = os.Chtimes(recentFilePath, recentTime, recentTime)

	// 3. Run cleanup with 24-hour threshold
	svc := services.NewStorageCleanupService(services.CleanupConfig{
		StorageDir:        tempRoot,
		RetentionDuration: 24 * time.Hour,
		DryRun:            false,
	})

	ctx := context.Background()
	metrics, err := svc.CleanupTempFiles(ctx)
	if err != nil {
		t.Fatalf("cleanup failed: %v", err)
	}

	if metrics.ScannedFiles != 2 {
		t.Errorf("expected 2 scanned files, got %d", metrics.ScannedFiles)
	}
	if metrics.DeletedFiles != 1 {
		t.Errorf("expected 1 deleted file, got %d", metrics.DeletedFiles)
	}
	if metrics.ReclaimedBytes != int64(len(dummyData)) {
		t.Errorf("expected %d reclaimed bytes, got %d", len(dummyData), metrics.ReclaimedBytes)
	}

	// 4. Verify expired file was deleted from disk
	if _, err := os.Stat(expiredFilePath); !os.IsNotExist(err) {
		t.Fatalf("expired file should have been deleted")
	}

	// 5. Verify recent file still exists on disk
	if _, err := os.Stat(recentFilePath); err != nil {
		t.Fatalf("recent file should NOT have been deleted: %v", err)
	}
}

func TestStorageCleanupService_DryRunMode(t *testing.T) {
	tempRoot := t.TempDir()
	tempDir := filepath.Join(tempRoot, "temp")
	_ = os.MkdirAll(tempDir, 0755)

	expiredFilePath := filepath.Join(tempDir, "expired_dry_run.wav")
	_ = os.WriteFile(expiredFilePath, []byte("some audio data"), 0644)
	oldTime := time.Now().Add(-72 * time.Hour)
	_ = os.Chtimes(expiredFilePath, oldTime, oldTime)

	svc := services.NewStorageCleanupService(services.CleanupConfig{
		StorageDir:        tempRoot,
		RetentionDuration: 24 * time.Hour,
		DryRun:            true, // DryRun enabled
	})

	metrics, err := svc.CleanupTempFiles(context.Background())
	if err != nil {
		t.Fatalf("dry-run failed: %v", err)
	}

	if metrics.DeletedFiles != 1 {
		t.Errorf("expected metrics to count 1 detected file, got %d", metrics.DeletedFiles)
	}

	// In DryRun, file must still physically exist on disk
	if _, err := os.Stat(expiredFilePath); err != nil {
		t.Fatalf("file should still exist on disk during DryRun: %v", err)
	}
}
