// Package audioutil provides subtitle format conversion and generator utilities.
package audioutil

import (
	"fmt"
	"regexp"
	"strings"

	"meowshadow/gateway-core/internal/domain"
)

var srtTimestampRegex = regexp.MustCompile(`(\d{2}:\d{2}:\d{2}),(\d{3})`)

// ConvertSrtToVtt converts SubRip (.srt) subtitle content into standard WebVTT format.
func ConvertSrtToVtt(srtContent string) string {
	if srtContent == "" {
		return "WEBVTT\n\n"
	}

	// Normalize CRLF to LF
	normalized := strings.ReplaceAll(srtContent, "\r\n", "\n")

	// Replace comma separator in timestamps (00:00:01,500 -> 00:00:01.500)
	vttTimestamps := srtTimestampRegex.ReplaceAllString(normalized, "$1.$2")

	// Prepend WEBVTT header
	var sb strings.Builder
	sb.WriteString("WEBVTT\n\n")
	sb.WriteString(strings.TrimSpace(vttTimestamps))
	sb.WriteString("\n")

	return sb.String()
}

// GenerateSrtFromChunks creates SubRip (.srt) format text from transcript chunks.
func GenerateSrtFromChunks(chunks []domain.ScriptChunk, durationSec float64) string {
	if len(chunks) == 0 {
		return ""
	}

	if durationSec <= 0 {
		durationSec = float64(len(chunks)) * 3.5
	}

	chunkDuration := durationSec / float64(len(chunks))
	var sb strings.Builder

	for i, chunk := range chunks {
		startSec := float64(i) * chunkDuration
		endSec := startSec + chunkDuration - 0.2
		if endSec <= startSec {
			endSec = startSec + 0.5
		}

		sb.WriteString(fmt.Sprintf("%d\n", i+1))
		sb.WriteString(fmt.Sprintf("%s --> %s\n", formatSrtTimestamp(startSec), formatSrtTimestamp(endSec)))
		sb.WriteString(fmt.Sprintf("[%s] %s\n\n", strings.ToUpper(chunk.Lang), chunk.Text))
	}

	return sb.String()
}

// GenerateVttFromChunks creates WebVTT format text from transcript chunks.
func GenerateVttFromChunks(chunks []domain.ScriptChunk, durationSec float64) string {
	srt := GenerateSrtFromChunks(chunks, durationSec)
	return ConvertSrtToVtt(srt)
}

func formatSrtTimestamp(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}
	totalMs := int64(seconds * 1000)
	ms := totalMs % 1000
	totalSec := totalMs / 1000
	sec := totalSec % 60
	totalMin := totalSec / 60
	min := totalMin % 60
	hours := totalMin / 60

	return fmt.Sprintf("%02d:%02d:%02d,%03d", hours, min, sec, ms)
}
