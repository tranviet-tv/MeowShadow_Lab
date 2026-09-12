// Package notifications provides mobile push notification dispatching (APNs / FCM)
// when audio rendering jobs finish or experience critical failures.
package notifications

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/repository"
)

// PushNotificationPayload represents standard cross-platform push payload.
type PushNotificationPayload struct {
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Badge int               `json:"badge,omitempty"`
	Sound string            `json:"sound,omitempty"`
	Data  map[string]string `json:"data,omitempty"`
}

// DispatchResult tracks delivery status per device token.
type DispatchResult struct {
	DeviceID   string `json:"device_id"`
	DeviceType string `json:"device_type"`
	PushToken  string `json:"push_token"`
	Success    bool   `json:"success"`
	Error      string `json:"error,omitempty"`
}

// PushProvider defines the transport layer interface for FCM / APNs.
type PushProvider interface {
	SendPush(ctx context.Context, deviceType, token string, payload PushNotificationPayload) error
}

// MockPushProvider records sent notifications for unit testing and local development.
type MockPushProvider struct {
	mu           sync.RWMutex
	SentMessages []SentMessageRecord
	ForceError   error
}

type SentMessageRecord struct {
	DeviceType string
	Token      string
	Payload    PushNotificationPayload
}

func NewMockPushProvider() *MockPushProvider {
	return &MockPushProvider{
		SentMessages: make([]SentMessageRecord, 0),
	}
}

func (m *MockPushProvider) SendPush(ctx context.Context, deviceType, token string, payload PushNotificationPayload) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.ForceError != nil {
		return m.ForceError
	}

	m.SentMessages = append(m.SentMessages, SentMessageRecord{
		DeviceType: deviceType,
		Token:      token,
		Payload:    payload,
	})
	return nil
}

func (m *MockPushProvider) GetSentCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.SentMessages)
}

// PushDispatcher defines high-level dispatch actions for lesson lifecycle events.
type PushDispatcher interface {
	DispatchLessonCompleted(ctx context.Context, userID, lessonID, lessonTitle string) ([]DispatchResult, error)
	DispatchLessonFailed(ctx context.Context, userID, lessonID, lessonTitle, errorMsg string) ([]DispatchResult, error)
	DispatchCustom(ctx context.Context, userID string, payload PushNotificationPayload) ([]DispatchResult, error)
}

type pushDispatcher struct {
	userRepo repository.UserRepository
	provider PushProvider
}

// NewPushDispatcher constructs a new PushDispatcher instance.
func NewPushDispatcher(userRepo repository.UserRepository, provider PushProvider) PushDispatcher {
	if provider == nil {
		provider = NewMockPushProvider()
	}
	return &pushDispatcher{
		userRepo: userRepo,
		provider: provider,
	}
}

// DispatchLessonCompleted sends push notifications when lesson audio and subtitles are ready.
func (d *pushDispatcher) DispatchLessonCompleted(ctx context.Context, userID, lessonID, lessonTitle string) ([]DispatchResult, error) {
	payload := PushNotificationPayload{
		Title: "Bài học của bạn đã sẵn sàng! 🎧",
		Body:  fmt.Sprintf("Bài học '%s' đã hoàn thành quá trình render audio & phụ đề. Bắt đầu luyện tập Shadowing ngay!", lessonTitle),
		Badge: 1,
		Sound: "default",
		Data: map[string]string{
			"type":      "LESSON_READY",
			"lesson_id": lessonID,
			"status":    "READY",
		},
	}

	return d.DispatchCustom(ctx, userID, payload)
}

// DispatchLessonFailed sends push notifications if audio synthesis or mastering encounters an error.
func (d *pushDispatcher) DispatchLessonFailed(ctx context.Context, userID, lessonID, lessonTitle, errorMsg string) ([]DispatchResult, error) {
	payload := PushNotificationPayload{
		Title: "Không thể hoàn tất bài học ⚠️",
		Body:  fmt.Sprintf("Quá trình xử lý bài học '%s' bị gián đoạn: %s", lessonTitle, errorMsg),
		Badge: 1,
		Sound: "default",
		Data: map[string]string{
			"type":      "LESSON_FAILED",
			"lesson_id": lessonID,
			"status":    "FAILED",
		},
	}

	return d.DispatchCustom(ctx, userID, payload)
}

// DispatchCustom resolves all registered devices for a user and dispatches push payloads.
func (d *pushDispatcher) DispatchCustom(ctx context.Context, userID string, payload PushNotificationPayload) ([]DispatchResult, error) {
	if userID == "" || d.userRepo == nil {
		return []DispatchResult{}, nil
	}

	parsedUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID for push notification: %w", err)
	}

	var pgUUID pgtype.UUID
	copy(pgUUID.Bytes[:], parsedUUID[:])
	pgUUID.Valid = true

	devices, err := d.userRepo.ListDevicesByUserID(ctx, pgUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user devices: %w", err)
	}

	if len(devices) == 0 {
		return []DispatchResult{}, nil
	}

	results := make([]DispatchResult, 0, len(devices))
	for _, dev := range devices {
		devIDStr := uuid.UUID(dev.ID.Bytes).String()
		sendErr := d.provider.SendPush(ctx, dev.DeviceType, dev.PushToken, payload)

		res := DispatchResult{
			DeviceID:   devIDStr,
			DeviceType: dev.DeviceType,
			PushToken:  dev.PushToken,
			Success:    sendErr == nil,
		}

		if sendErr != nil {
			res.Error = sendErr.Error()
			log.Printf("Failed to dispatch push notification to device %s: %v", devIDStr, sendErr)
		}

		results = append(results, res)
	}

	return results, nil
}
