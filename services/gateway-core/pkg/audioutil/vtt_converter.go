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

// SubtitleTimestampItem represents a structured subtitle segment for API clients.
type SubtitleTimestampItem struct {
	ID           int     `json:"id"`
	StartTimeSec float64 `json:"startTimeSec"`
	EndTimeSec   float64 `json:"endTimeSec"`
	Lang         string  `json:"lang"`
	Text         string  `json:"text"`
}

// ParseSrtToTimestamps parses SubRip text content into structured timestamp items.
func ParseSrtToTimestamps(srtContent string) []SubtitleTimestampItem {
	var items []SubtitleTimestampItem
	if strings.TrimSpace(srtContent) == "" {
		return items
	}

	blocks := strings.Split(strings.ReplaceAll(srtContent, "\r\n", "\n"), "\n\n")
	tagRegex := regexp.MustCompile(`^\[([A-Za-z]{2})\]\s*(.*)`)
	timeRegex := regexp.MustCompile(`(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})`)

	for _, block := range blocks {
		lines := strings.Split(strings.TrimSpace(block), "\n")
		if len(lines) < 3 {
			continue
		}

		var id int
		_, _ = fmt.Sscanf(lines[0], "%d", &id)
		if id == 0 {
			id = len(items) + 1
		}

		timeMatches := timeRegex.FindStringSubmatch(lines[1])
		if len(timeMatches) != 9 {
			continue
		}

		parseTime := func(h, m, s, ms string) float64 {
			var hi, mi, si, msi int
			_, _ = fmt.Sscanf(h, "%d", &hi)
			_, _ = fmt.Sscanf(m, "%d", &mi)
			_, _ = fmt.Sscanf(s, "%d", &si)
			_, _ = fmt.Sscanf(ms, "%d", &msi)
			return float64(hi*3600+mi*60+si) + float64(msi)/1000.0
		}

		startSec := parseTime(timeMatches[1], timeMatches[2], timeMatches[3], timeMatches[4])
		endSec := parseTime(timeMatches[5], timeMatches[6], timeMatches[7], timeMatches[8])

		rawText := strings.TrimSpace(strings.Join(lines[2:], " "))
		lang := "en"
		text := rawText

		tagMatches := tagRegex.FindStringSubmatch(rawText)
		if len(tagMatches) == 3 {
			lang = strings.ToLower(tagMatches[1])
			text = strings.TrimSpace(tagMatches[2])
		}

		items = append(items, SubtitleTimestampItem{
			ID:           id,
			StartTimeSec: startSec,
			EndTimeSec:   endSec,
			Lang:         lang,
			Text:         text,
		})
	}

	return items
}

// GenerateTimestampsFromChunks creates structured subtitle timestamps directly from chunks.
func GenerateTimestampsFromChunks(chunks []domain.ScriptChunk, durationSec float64) []SubtitleTimestampItem {
	if len(chunks) == 0 {
		return nil
	}
	if durationSec <= 0 {
		durationSec = float64(len(chunks)) * 3.5
	}
	chunkDuration := durationSec / float64(len(chunks))
	items := make([]SubtitleTimestampItem, len(chunks))

	for i, chunk := range chunks {
		startSec := float64(i) * chunkDuration
		endSec := startSec + chunkDuration - 0.2
		if endSec <= startSec {
			endSec = startSec + 0.5
		}
		items[i] = SubtitleTimestampItem{
			ID:           i + 1,
			StartTimeSec: startSec,
			EndTimeSec:   endSec,
			Lang:         chunk.Lang,
			Text:         chunk.Text,
		}
	}
	return items
}
