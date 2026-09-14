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
	ID                    string        `json:"id"`
	UserID                string        `json:"user_id,omitempty"`
	Title                 string        `json:"title"`
	TargetLanguage        string        `json:"target_language"`
	TargetLanguageCamel   string        `json:"targetLanguage,omitempty"`
	SourceLanguage        string        `json:"source_language"`
	SourceLanguageCamel   string        `json:"sourceLanguage,omitempty"`
	TotalWords            int           `json:"total_words"`
	TotalWordsCamel       int           `json:"totalWords,omitempty"`
	DurationSec           float64       `json:"duration_sec"`
	DurationSecCamel      float64       `json:"durationSec,omitempty"`
	PacingConfig          PacingConfig  `json:"pacing_config"`
	PacingConfigCamel     *PacingConfig `json:"pacingConfig,omitempty"`
	TranscriptChunks      []ScriptChunk `json:"transcript_chunks"`
	TranscriptChunksCamel []ScriptChunk `json:"transcriptChunks,omitempty"`
	AudioFilePath         string        `json:"audio_file_path"`
	AudioURL              string        `json:"audioUrl,omitempty"`
	SrtFilePath           string        `json:"srt_file_path"`
	SrtURL                string        `json:"srtUrl,omitempty"`
	Status                string        `json:"status"`
	CreatedAt             string        `json:"created_at"`
	CreatedAtCamel        string        `json:"createdAt,omitempty"`
	UpdatedAt             string        `json:"updated_at"`
	UpdatedAtCamel        string        `json:"updatedAt,omitempty"`
}

// PopulateCamelCase synchronizes snake_case values to camelCase fields for client compatibility.
func (r *LessonResponse) PopulateCamelCase() {
	r.TargetLanguageCamel = r.TargetLanguage
	r.SourceLanguageCamel = r.SourceLanguage
	r.TotalWordsCamel = r.TotalWords
	r.DurationSecCamel = r.DurationSec
	r.PacingConfigCamel = &r.PacingConfig
	r.TranscriptChunksCamel = r.TranscriptChunks
	if r.AudioURL == "" && r.ID != "" {
		r.AudioURL = "/api/v1/audio/stream/" + r.ID
	}
	if r.SrtURL == "" && r.ID != "" {
		r.SrtURL = "/api/v1/lessons/" + r.ID + "/export?format=srt"
	}
	r.CreatedAtCamel = r.CreatedAt
	r.UpdatedAtCamel = r.UpdatedAt
}

// GenerateAudioRequest holds input parameters to trigger asynchronous audio rendering.
type GenerateAudioRequest struct {
	LessonID              string        `json:"lesson_id,omitempty"`
	LessonIDCamel         string        `json:"lessonId,omitempty"`
	Title                 string        `json:"title"`
	TargetLanguage        string        `json:"target_language"`
	TargetLanguageCamel   string        `json:"targetLanguage,omitempty"`
	SourceLanguage        string        `json:"source_language,omitempty"`
	SourceLanguageCamel   string        `json:"sourceLanguage,omitempty"`
	SourceText            string        `json:"source_text"`
	SourceTextCamel       string        `json:"sourceText,omitempty"`
	TtsEngine             string        `json:"tts_engine,omitempty"`
	TtsEngineCamel        string        `json:"ttsEngine,omitempty"`
	PacingConfig          PacingConfig  `json:"pacing_config"`
	PacingConfigCamel     *PacingConfig `json:"pacingConfig,omitempty"`
	TranscriptChunks      []ScriptChunk `json:"transcript_chunks,omitempty"`
	TranscriptChunksCamel []ScriptChunk `json:"transcriptChunks,omitempty"`
}

// Normalize ensures values provided in either snake_case or camelCase are available.
func (r *GenerateAudioRequest) Normalize() {
	if r.LessonID == "" && r.LessonIDCamel != "" {
		r.LessonID = r.LessonIDCamel
	}
	if r.TargetLanguage == "" && r.TargetLanguageCamel != "" {
		r.TargetLanguage = r.TargetLanguageCamel
	}
	if r.SourceLanguage == "" && r.SourceLanguageCamel != "" {
		r.SourceLanguage = r.SourceLanguageCamel
	}
	if r.SourceText == "" && r.SourceTextCamel != "" {
		r.SourceText = r.SourceTextCamel
	}
	if r.TtsEngine == "" && r.TtsEngineCamel != "" {
		r.TtsEngine = r.TtsEngineCamel
	}
	if r.PacingConfigCamel != nil && r.PacingConfig.TargetSpeed == 0 {
		r.PacingConfig = *r.PacingConfigCamel
	}
	if len(r.TranscriptChunks) == 0 && len(r.TranscriptChunksCamel) > 0 {
		r.TranscriptChunks = r.TranscriptChunksCamel
	}
}

// GenerateAudioResponse is returned with HTTP 202 Accepted when a render task is queued.
type GenerateAudioResponse struct {
	TaskID     string `json:"task_id"`
	Status     string `json:"status"`
	Message    string `json:"message"`
	WsEndpoint string `json:"ws_endpoint"`
}

// SyncProgressRequest defines parameters for updating playback/learning progress.
type SyncProgressRequest struct {
	LessonID             string  `json:"lesson_id"`
	LessonIDCamel        string  `json:"lessonId,omitempty"`
	PlaybackOffsetSec    float64 `json:"playback_offset_sec"`
	PlaybackOffsetCamel  float64 `json:"playbackOffsetSec,omitempty"`
	ShadowingRepeatCount int     `json:"shadowing_repeat_count"`
	ShadowingRepeatCamel int     `json:"shadowingRepeatCount,omitempty"`
	IsCompleted          bool    `json:"is_completed"`
	IsCompletedCamel     bool    `json:"isCompleted,omitempty"`
	Version              int     `json:"version,omitempty"`
}

// Normalize ensures values provided in either snake_case or camelCase are available.
func (r *SyncProgressRequest) Normalize() {
	if r.LessonID == "" && r.LessonIDCamel != "" {
		r.LessonID = r.LessonIDCamel
	}
	if r.PlaybackOffsetSec == 0 && r.PlaybackOffsetCamel != 0 {
		r.PlaybackOffsetSec = r.PlaybackOffsetCamel
	}
	if r.ShadowingRepeatCount == 0 && r.ShadowingRepeatCamel != 0 {
		r.ShadowingRepeatCount = r.ShadowingRepeatCamel
	}
	if !r.IsCompleted && r.IsCompletedCamel {
		r.IsCompleted = r.IsCompletedCamel
	}
}

// LearningProgressDTO represents the learning progress response.
type LearningProgressDTO struct {
	LessonID             string  `json:"lesson_id"`
	UserID               string  `json:"user_id"`
	PlaybackOffsetSec    float64 `json:"playback_offset_sec"`
	ShadowingRepeatCount int     `json:"shadowing_repeat_count"`
	IsCompleted          bool    `json:"is_completed"`
	Version              int     `json:"version"`
	LastListenedAt       string  `json:"last_listened_at"`
}

