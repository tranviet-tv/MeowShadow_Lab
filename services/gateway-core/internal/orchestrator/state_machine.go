// Package orchestrator manages the asynchronous audio rendering pipeline,
// state transitions, and task lifecycle coordination.
package orchestrator

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"meowshadow/gateway-core/internal/domain"
)

// JobState defines valid lifecycle stages of a render job.
type JobState string

const (
	StatePending      JobState = "PENDING"
	StateParsing      JobState = "PARSING"
	StateSynthesizing JobState = "SYNTHESIZING"
	StateMastering    JobState = "MASTERING"
	StateReady        JobState = "READY"
	StateFailed       JobState = "FAILED"
)

// Standard progress percentages associated with pipeline stages.
var stateProgress = map[JobState]int{
	StatePending:      0,
	StateParsing:      15,
	StateSynthesizing: 60,
	StateMastering:    90,
	StateReady:        100,
	StateFailed:       0,
}

// Stage descriptions for client feedback and logging.
var stateDescriptions = map[JobState]string{
	StatePending:      "Job queued and awaiting processing",
	StateParsing:      "Parsing script structure and language tags",
	StateSynthesizing: "Synthesizing voice clips for chunks",
	StateMastering:    "Applying smart silence pacing and audio mastering",
	StateReady:        "Lesson audio and subtitles rendering complete",
	StateFailed:       "Pipeline rendering failed",
}

// Allowed state transitions ensuring deterministic pipeline execution.
var validTransitions = map[JobState][]JobState{
	StatePending:      {StateParsing, StateFailed},
	StateParsing:      {StateSynthesizing, StateFailed},
	StateSynthesizing: {StateMastering, StateFailed},
	StateMastering:    {StateReady, StateFailed},
	StateReady:        {},
	StateFailed:       {},
}

var (
	ErrInvalidTransition = errors.New("invalid state transition")
	ErrTerminalState     = errors.New("job is already in a terminal state")
)

// RenderJob represents an active or completed rendering pipeline task.
type RenderJob struct {
	mu sync.RWMutex

	ID               string               `json:"id"`
	LessonID         string               `json:"lesson_id"`
	UserID           string               `json:"user_id,omitempty"`
	Title            string               `json:"title"`
	TargetLanguage   string               `json:"target_language"`
	SourceLanguage   string               `json:"source_language"`
	RawText          string               `json:"raw_text,omitempty"`
	PacingConfig     domain.PacingConfig  `json:"pacing_config"`
	TranscriptChunks []domain.ScriptChunk `json:"transcript_chunks,omitempty"`
	AudioClipPaths   []string             `json:"audio_clip_paths,omitempty"`
	AudioFilePath    string               `json:"audio_file_path,omitempty"`
	SrtFilePath      string               `json:"srt_file_path,omitempty"`
	DurationSec      float64              `json:"duration_sec,omitempty"`
	CurrentState     JobState             `json:"current_state"`
	ProgressPercent  int                  `json:"progress_percent"`
	Description      string               `json:"description"`
	ErrorMessage     string               `json:"error_message,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
	UpdatedAt        time.Time            `json:"updated_at"`
}

// NewRenderJob creates an initial render job in PENDING state.
func NewRenderJob(
	jobID string,
	lessonID string,
	userID string,
	title string,
	targetLang string,
	sourceLang string,
	rawText string,
	pacing domain.PacingConfig,
) *RenderJob {
	now := time.Now().UTC()
	if sourceLang == "" {
		sourceLang = "vi"
	}
	if targetLang == "" {
		targetLang = "en"
	}

	return &RenderJob{
		ID:              jobID,
		LessonID:        lessonID,
		UserID:          userID,
		Title:           title,
		TargetLanguage:  targetLang,
		SourceLanguage:  sourceLang,
		RawText:         rawText,
		PacingConfig:    pacing,
		CurrentState:    StatePending,
		ProgressPercent: stateProgress[StatePending],
		Description:     stateDescriptions[StatePending],
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

// TransitionTo validates and performs a state transition on the render job.
func (j *RenderJob) TransitionTo(newState JobState, errorMsg string) error {
	j.mu.Lock()
	defer j.mu.Unlock()

	if j.CurrentState == StateReady || j.CurrentState == StateFailed {
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrTerminalState, j.CurrentState, newState)
	}

	allowed := validTransitions[j.CurrentState]
	valid := false
	for _, target := range allowed {
		if target == newState {
			valid = true
			break
		}
	}

	if !valid {
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrInvalidTransition, j.CurrentState, newState)
	}

	j.CurrentState = newState
	if newState == StateFailed {
		j.ErrorMessage = errorMsg
		j.Description = fmt.Sprintf("%s: %s", stateDescriptions[StateFailed], errorMsg)
	} else {
		j.ProgressPercent = stateProgress[newState]
		j.Description = stateDescriptions[newState]
	}
	j.UpdatedAt = time.Now().UTC()

	return nil
}

// IsTerminal returns true if the job is finished (READY or FAILED).
func (j *RenderJob) IsTerminal() bool {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return j.CurrentState == StateReady || j.CurrentState == StateFailed
}

// GetState returns the current state in a thread-safe manner.
func (j *RenderJob) GetState() JobState {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return j.CurrentState
}

// GetProgress returns the current progress percentage.
func (j *RenderJob) GetProgress() int {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return j.ProgressPercent
}

// GetSnapshot returns a copy of the job data for serialization or broadcasting.
func (j *RenderJob) GetSnapshot() RenderJob {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return *j
}

// EstimatedRemainingSec returns estimated seconds remaining based on current stage and total words.
func (j *RenderJob) EstimatedRemainingSec(totalWords int) float64 {
	j.mu.RLock()
	defer j.mu.RUnlock()

	baseSec := float64(totalWords) * 0.15
	if baseSec < 5.0 {
		baseSec = 5.0
	}

	switch j.CurrentState {
	case StatePending:
		return baseSec * 1.0
	case StateParsing:
		return baseSec * 0.85
	case StateSynthesizing:
		return baseSec * 0.40
	case StateMastering:
		return baseSec * 0.10
	case StateReady, StateFailed:
		return 0.0
	default:
		return 0.0
	}
}
