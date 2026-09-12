// Package audioutil provides utilities for audio byte-range parsing,
// timestamp formatting, and subtitle conversions.
package audioutil

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var (
	ErrInvalidRange       = errors.New("invalid range header format")
	ErrUnsatisfiableRange = errors.New("range not satisfiable")
)

// ByteRange specifies a contiguous byte slice requested by a media player.
type ByteRange struct {
	Start     int64
	End       int64
	Length    int64
	TotalSize int64
}

// ContentRangeHeader formats the standard Content-Range response header (RFC 7233).
func (r *ByteRange) ContentRangeHeader() string {
	return fmt.Sprintf("bytes %d-%d/%d", r.Start, r.End, r.TotalSize)
}

// ParseByteRange parses a single byte-range specification from the HTTP Range header.
// Supported formats:
// - "bytes=start-end" (e.g., "bytes=0-1024", "bytes=0-1" for Safari probe)
// - "bytes=start-"    (e.g., "bytes=1024-")
// - "bytes=-suffix"   (e.g., "bytes=-500" for last 500 bytes)
func ParseByteRange(rangeHeader string, totalSize int64) (*ByteRange, error) {
	if rangeHeader == "" {
		return nil, ErrInvalidRange
	}

	rangeHeader = strings.TrimSpace(rangeHeader)
	if !strings.HasPrefix(rangeHeader, "bytes=") {
		return nil, ErrInvalidRange
	}

	spec := strings.TrimPrefix(rangeHeader, "bytes=")
	spec = strings.TrimSpace(spec)

	// If multiple comma-separated ranges are requested, take the first range
	if idx := strings.IndexByte(spec, ','); idx != -1 {
		spec = spec[:idx]
	}

	parts := strings.Split(spec, "-")
	if len(parts) != 2 {
		return nil, ErrInvalidRange
	}

	startStr := strings.TrimSpace(parts[0])
	endStr := strings.TrimSpace(parts[1])

	var start, end int64

	if startStr == "" && endStr == "" {
		return nil, ErrInvalidRange
	}

	if startStr == "" {
		// Suffix range: "bytes=-500"
		suffixLen, err := strconv.ParseInt(endStr, 10, 64)
		if err != nil || suffixLen <= 0 {
			return nil, ErrInvalidRange
		}
		if suffixLen > totalSize {
			suffixLen = totalSize
		}
		start = totalSize - suffixLen
		end = totalSize - 1
	} else if endStr == "" {
		// Open range: "bytes=1024-"
		parsedStart, err := strconv.ParseInt(startStr, 10, 64)
		if err != nil || parsedStart < 0 {
			return nil, ErrInvalidRange
		}
		start = parsedStart
		end = totalSize - 1
	} else {
		// Closed range: "bytes=0-1024"
		parsedStart, err1 := strconv.ParseInt(startStr, 10, 64)
		parsedEnd, err2 := strconv.ParseInt(endStr, 10, 64)
		if err1 != nil || err2 != nil || parsedStart < 0 || parsedEnd < 0 {
			return nil, ErrInvalidRange
		}
		start = parsedStart
		end = parsedEnd
	}

	// Validate range bounds
	if start >= totalSize {
		return nil, ErrUnsatisfiableRange
	}
	if end >= totalSize {
		end = totalSize - 1
	}
	if start > end {
		return nil, ErrInvalidRange
	}

	length := (end - start) + 1

	return &ByteRange{
		Start:     start,
		End:       end,
		Length:    length,
		TotalSize: totalSize,
	}, nil
}
