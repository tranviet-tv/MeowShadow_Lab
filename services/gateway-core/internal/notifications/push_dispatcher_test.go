package notifications_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/notifications"
	"meowshadow/gateway-core/internal/repository/db"
)

type mockUserRepoForPush struct {
	devices []db.UserDevice
	err     error
}

func (m *mockUserRepoForPush) CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error) {
	return nil, nil
}
func (m *mockUserRepoForPush) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	return nil, nil
}
func (m *mockUserRepoForPush) GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error) {
	return nil, nil
}
func (m *mockUserRepoForPush) ListDevicesByUserID(ctx context.Context, userID pgtype.UUID) ([]db.UserDevice, error) {
	return m.devices, m.err
}
func (m *mockUserRepoForPush) UpsertUserDevice(ctx context.Context, userID pgtype.UUID, deviceType, pushToken string) error {
	return nil
}

func TestPushDispatcher_LessonCompleted(t *testing.T) {
	uID := uuid.New()
	dev1ID := uuid.New()
	dev2ID := uuid.New()

	var uUUID, d1UUID, d2UUID pgtype.UUID
	copy(uUUID.Bytes[:], uID[:])
	uUUID.Valid = true
	copy(d1UUID.Bytes[:], dev1ID[:])
	d1UUID.Valid = true
	copy(d2UUID.Bytes[:], dev2ID[:])
	d2UUID.Valid = true

	mockRepo := &mockUserRepoForPush{
		devices: []db.UserDevice{
			{ID: d1UUID, UserID: uUUID, DeviceType: "ios", PushToken: "token_apns_iphone15"},
			{ID: d2UUID, UserID: uUUID, DeviceType: "android", PushToken: "token_fcm_pixel8"},
		},
	}

	provider := notifications.NewMockPushProvider()
	dispatcher := notifications.NewPushDispatcher(mockRepo, provider)

	ctx := context.Background()
	results, err := dispatcher.DispatchLessonCompleted(ctx, uID.String(), "lesson-123", "Shadowing Unit 1")
	if err != nil {
		t.Fatalf("unexpected dispatch error: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 dispatch results, got %d", len(results))
	}

	for _, r := range results {
		if !r.Success {
			t.Fatalf("expected device send success, got error: %s", r.Error)
		}
	}

	if provider.GetSentCount() != 2 {
		t.Fatalf("expected provider to record 2 sent messages, got %d", provider.GetSentCount())
	}

	msg := provider.SentMessages[0]
	if msg.Payload.Data["type"] != "LESSON_READY" {
		t.Fatalf("expected payload type LESSON_READY, got %s", msg.Payload.Data["type"])
	}
}

func TestPushDispatcher_NoDevicesGraceful(t *testing.T) {
	uID := uuid.New()
	mockRepo := &mockUserRepoForPush{
		devices: []db.UserDevice{},
	}

	provider := notifications.NewMockPushProvider()
	dispatcher := notifications.NewPushDispatcher(mockRepo, provider)

	ctx := context.Background()
	results, err := dispatcher.DispatchLessonCompleted(ctx, uID.String(), "lesson-999", "Empty Devices")
	if err != nil {
		t.Fatalf("unexpected error when no devices found: %v", err)
	}

	if len(results) != 0 {
		t.Fatalf("expected 0 results, got %d", len(results))
	}
	if provider.GetSentCount() != 0 {
		t.Fatalf("expected 0 messages sent")
	}
}

func TestPushDispatcher_LessonFailed(t *testing.T) {
	uID := uuid.New()
	dID := uuid.New()
	var uUUID, dUUID pgtype.UUID
	copy(uUUID.Bytes[:], uID[:])
	uUUID.Valid = true
	copy(dUUID.Bytes[:], dID[:])
	dUUID.Valid = true

	mockRepo := &mockUserRepoForPush{
		devices: []db.UserDevice{
			{ID: dUUID, UserID: uUUID, DeviceType: "ios", PushToken: "token_apns_failure_test"},
		},
	}

	provider := notifications.NewMockPushProvider()
	dispatcher := notifications.NewPushDispatcher(mockRepo, provider)

	ctx := context.Background()
	results, err := dispatcher.DispatchLessonFailed(ctx, uID.String(), "lesson-fail-1", "Broken Lesson", "FFmpeg syntax error")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 1 || !results[0].Success {
		t.Fatalf("expected 1 successful dispatch")
	}

	msg := provider.SentMessages[0]
	if msg.Payload.Data["type"] != "LESSON_FAILED" {
		t.Fatalf("expected payload type LESSON_FAILED, got %s", msg.Payload.Data["type"])
	}
}

func TestPushDispatcher_ProviderErrorHandling(t *testing.T) {
	uID := uuid.New()
	dID := uuid.New()
	var uUUID, dUUID pgtype.UUID
	copy(uUUID.Bytes[:], uID[:])
	uUUID.Valid = true
	copy(dUUID.Bytes[:], dID[:])
	dUUID.Valid = true

	mockRepo := &mockUserRepoForPush{
		devices: []db.UserDevice{
			{ID: dUUID, UserID: uUUID, DeviceType: "android", PushToken: "invalid_fcm_token"},
		},
	}

	provider := notifications.NewMockPushProvider()
	provider.ForceError = errors.New("FCM returned 404 Unregistered")

	dispatcher := notifications.NewPushDispatcher(mockRepo, provider)

	ctx := context.Background()
	results, err := dispatcher.DispatchLessonCompleted(ctx, uID.String(), "lesson-err", "Error Test")
	if err != nil {
		t.Fatalf("dispatcher should not fail top-level error on device delivery failure: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result")
	}
	if results[0].Success {
		t.Fatalf("expected device result Success to be false")
	}
	if results[0].Error == "" {
		t.Fatalf("expected error string to be populated")
	}
}
