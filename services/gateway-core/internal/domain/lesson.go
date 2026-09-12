// Package domain defines core entities, domain models, and data contracts.
package domain

// ScriptChunk represents a single transcribed or synthesized sentence chunk.
type ScriptChunk struct {
	ID        string  `json:"id"`
	Order     int     `json:"order"`
	Lang      string  `json:"lang"` // "vi", "en", "ja"
	Text      string  `json:"text"`
	VoiceID   string  `json:"voice_id,omitempty"`
	SpeedRate float64 `json:"speed_rate,omitempty"`
}

// PacingConfig contains audio timing, speech rate, and silence pause parameters.
type PacingConfig struct {
	ViVoice                    string  `json:"vi_voice"`
	TargetVoice                string  `json:"target_voice"`
	ViSpeed                    float64 `json:"vi_speed"`
	TargetSpeed                float64 `json:"target_speed"`
	SilenceAfterViSec          float64 `json:"silence_after_vi_sec"`
	SilenceAfterTargetSec      float64 `json:"silence_after_target_sec"`
	SilenceBetweenSentencesSec float64 `json:"silence_between_sentences_sec"`
	InsertCueSound             bool    `json:"insert_cue_sound"`
}

// CreateLessonRequest holds input parameters for creating a new lesson.
type CreateLessonRequest struct {
	Title            string        `json:"title"`
	TargetLanguage   string        `json:"target_language"` // "en" or "ja"
	SourceLanguage   string        `json:"source_language"` // default "vi"
	TotalWords       int           `json:"total_words"`
	DurationSec      float64       `json:"duration_sec"`
	PacingConfig     PacingConfig  `json:"pacing_config"`
	TranscriptChunks []ScriptChunk `json:"transcript_chunks"`
	AudioFilePath    string        `json:"audio_file_path"`
	SrtFilePath      string        `json:"srt_file_path"`
	Status           string        `json:"status,omitempty"` // "READY", "PENDING", etc.
}

// LessonResponse represents a complete lesson returned by API endpoints.
type LessonResponse struct {
	ID               string        `json:"id"`
	UserID           string        `json:"user_id,omitempty"`
	Title            string        `json:"title"`
	TargetLanguage   string        `json:"target_language"`
	SourceLanguage   string        `json:"source_language"`
	TotalWords       int           `json:"total_words"`
	DurationSec      float64       `json:"duration_sec"`
	PacingConfig     PacingConfig  `json:"pacing_config"`
	TranscriptChunks []ScriptChunk `json:"transcript_chunks"`
	AudioFilePath    string        `json:"audio_file_path"`
	SrtFilePath      string        `json:"srt_file_path"`
	Status           string        `json:"status"`
	CreatedAt        string        `json:"created_at"`
	UpdatedAt        string        `json:"updated_at"`
}
