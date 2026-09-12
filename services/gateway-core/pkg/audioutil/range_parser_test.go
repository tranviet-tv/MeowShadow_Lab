package audioutil_test

import (
	"errors"
	"testing"

	"meowshadow/gateway-core/pkg/audioutil"
)

func TestParseByteRange(t *testing.T) {
	totalSize := int64(10000)

	tests := []struct {
		name       string
		header     string
		total      int64
		wantStart  int64
		wantEnd    int64
		wantLength int64
		wantErr    error
	}{
		{
			name:       "Standard range 0-1024",
			header:     "bytes=0-1024",
			total:      totalSize,
			wantStart:  0,
			wantEnd:    1024,
			wantLength: 1025,
			wantErr:    nil,
		},
		{
			name:       "Safari 2-byte probe 0-1",
			header:     "bytes=0-1",
			total:      totalSize,
			wantStart:  0,
			wantEnd:    1,
			wantLength: 2,
			wantErr:    nil,
		},
		{
			name:       "Open-ended range 1024-",
			header:     "bytes=1024-",
			total:      totalSize,
			wantStart:  1024,
			wantEnd:    9999,
			wantLength: 8976,
			wantErr:    nil,
		},
		{
			name:       "Suffix range -500",
			header:     "bytes=-500",
			total:      totalSize,
			wantStart:  9500,
			wantEnd:    9999,
			wantLength: 500,
			wantErr:    nil,
		},
		{
			name:       "End exceeds total size",
			header:     "bytes=9000-15000",
			total:      totalSize,
			wantStart:  9000,
			wantEnd:    9999,
			wantLength: 1000,
			wantErr:    nil,
		},
		{
			name:       "Unsatisfiable range (start >= total)",
			header:     "bytes=10000-11000",
			total:      totalSize,
			wantStart:  0,
			wantEnd:    0,
			wantLength: 0,
			wantErr:    audioutil.ErrUnsatisfiableRange,
		},
		{
			name:       "Invalid range syntax (reversed start and end)",
			header:     "bytes=500-200",
			total:      totalSize,
			wantStart:  0,
			wantEnd:    0,
			wantLength: 0,
			wantErr:    audioutil.ErrInvalidRange,
		},
		{
			name:       "Missing bytes= prefix",
			header:     "0-1024",
			total:      totalSize,
			wantStart:  0,
			wantEnd:    0,
			wantLength: 0,
			wantErr:    audioutil.ErrInvalidRange,
		},
		{
			name:       "Empty header",
			header:     "",
			total:      totalSize,
			wantStart:  0,
			wantEnd:    0,
			wantLength: 0,
			wantErr:    audioutil.ErrInvalidRange,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r, err := audioutil.ParseByteRange(tc.header, tc.total)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("expected error %v, got %v", tc.wantErr, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if r.Start != tc.wantStart || r.End != tc.wantEnd || r.Length != tc.wantLength {
				t.Fatalf("got range [%d-%d] len=%d; want [%d-%d] len=%d",
					r.Start, r.End, r.Length, tc.wantStart, tc.wantEnd, tc.wantLength)
			}
		})
	}
}
