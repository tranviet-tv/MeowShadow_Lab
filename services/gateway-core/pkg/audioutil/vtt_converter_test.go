package audioutil_test

import (
	"strings"
	"testing"

	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/pkg/audioutil"
)

func TestConvertSrtToVtt(t *testing.T) {
	srtInput := `1
00:00:01,500 --> 00:00:04,200
[VI] Kiên trì là bí quyết lớn nhất.

2
00:00:04,700 --> 00:00:08,200
[EN] Persistence is the greatest secret.`

	vttOutput := audioutil.ConvertSrtToVtt(srtInput)

	if !strings.HasPrefix(vttOutput, "WEBVTT\n\n") {
		t.Fatalf("expected WEBVTT header at beginning, got: %s", vttOutput)
	}

	if strings.Contains(vttOutput, ",500") || strings.Contains(vttOutput, ",200") {
		t.Fatalf("expected dot decimal separator for milliseconds, found comma: %s", vttOutput)
	}

	if !strings.Contains(vttOutput, "00:00:01.500 --> 00:00:04.200") {
		t.Fatalf("missing converted timestamp line: %s", vttOutput)
	}

	if !strings.Contains(vttOutput, "[EN] Persistence is the greatest secret.") {
		t.Fatalf("missing text content: %s", vttOutput)
	}
}

func TestGenerateSrtAndVttFromChunks(t *testing.T) {
	chunks := []domain.ScriptChunk{
		{ID: "1", Order: 1, Lang: "vi", Text: "Xin chao the gioi"},
		{ID: "2", Order: 2, Lang: "en", Text: "Hello world"},
	}

	srt := audioutil.GenerateSrtFromChunks(chunks, 10.0)
	if !strings.Contains(srt, "00:00:00,000 -->") {
		t.Fatalf("expected first SRT chunk starting at 00:00:00,000, got: %s", srt)
	}
	if !strings.Contains(srt, "[VI] Xin chao the gioi") {
		t.Fatalf("expected [VI] tag in SRT, got: %s", srt)
	}

	vtt := audioutil.GenerateVttFromChunks(chunks, 10.0)
	if !strings.HasPrefix(vtt, "WEBVTT\n\n") {
		t.Fatalf("expected WEBVTT header, got: %s", vtt)
	}
	if !strings.Contains(vtt, "00:00:00.000 -->") {
		t.Fatalf("expected first WebVTT timestamp with dot separator, got: %s", vtt)
	}
}
