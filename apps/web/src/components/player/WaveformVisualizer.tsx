'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatTime } from '@/lib/utils';
import { Activity, Sparkles } from 'lucide-react';

interface WaveformVisualizerProps {
  lessonId?: string;
  height?: number;
}

/**
 * Generates an organic simulated waveform envelope when physical JSON is loading or offline.
 */
function generateSyntheticPeaks(count: number = 100): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate spoken segments interspersed with silence pauses
    const cycle = i % 20;
    if (cycle > 14) {
      // Silence pause
      peaks.push(Math.random() * 0.08 + 0.02);
    } else {
      // Active speech modulation
      const envelope = Math.sin((cycle / 14) * Math.PI);
      const randomJitter = Math.random() * 0.4 + 0.6;
      peaks.push(Math.min(1.0, Math.max(0.15, envelope * randomJitter)));
    }
  }
  return peaks;
}

export function WaveformVisualizer({
  lessonId,
  height = 72,
}: WaveformVisualizerProps) {
  const { currentTime, duration, seek } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [peaks, setPeaks] = useState<number[]>(() => generateSyntheticPeaks(120));
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Fetch real waveform peaks from backend if lessonId is provided
  useEffect(() => {
    if (!lessonId) return;

    let isMounted = true;
    const waveformUrl = `/api/v1/lessons/${lessonId}/waveform.json`;

    fetch(waveformUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Waveform not found');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        // Backend returns either { data: number[] } or { peaks: number[] }
        const rawPoints = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.peaks)
          ? data.peaks
          : null;

        if (rawPoints && rawPoints.length > 0) {
          // Normalize to positive values [0, 1]
          const normalized = rawPoints.map((val: number) => {
            const abs = Math.abs(val);
            return abs > 1 ? abs / 128 : abs;
          });
          setPeaks(normalized);
        }
      })
      .catch(() => {
        // Fallback to synthetic peaks
        if (isMounted) {
          setPeaks(generateSyntheticPeaks(120));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  // Compute active time and progress ratio
  const activeTime = isDragging && scrubTime !== null ? scrubTime : currentTime;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, activeTime / duration)) : 0;

  // Draw waveform canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const canvasHeight = canvas.height;

    ctx.clearRect(0, 0, width, canvasHeight);

    const barCount = peaks.length;
    const barSpacing = width / barCount;
    const barWidth = Math.max(2, barSpacing * 0.7);
    const middleY = canvasHeight / 2;

    for (let i = 0; i < barCount; i++) {
      const peak = peaks[i] || 0.1;
      const barH = Math.max(4, peak * (canvasHeight - 12));
      const x = i * barSpacing + (barSpacing - barWidth) / 2;
      const y = middleY - barH / 2;

      const isPlayed = i / barCount <= progressRatio;

      if (isPlayed) {
        // Played bars gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
        gradient.addColorStop(0, '#818cf8'); // Indigo light
        gradient.addColorStop(1, '#a855f7'); // Purple
        ctx.fillStyle = gradient;
      } else {
        // Unplayed bars
        ctx.fillStyle = '#334155'; // Slate 700
      }

      // Draw rounded bar
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 2);
      ctx.fill();
    }

    // Draw Playhead line cursor
    const playheadX = progressRatio * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#818cf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [peaks, progressRatio]);

  // Redraw when peaks, progressRatio, or canvas dimensions change
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = height;
        drawWaveform();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, drawWaveform]);

  // Window drag event listeners to prevent stuttering and handle drag release outside container
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || duration <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const ratio = currentX / rect.width;
      const targetTime = ratio * duration;
      setScrubTime(targetTime);
      setHoverTime(targetTime);
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (containerRef.current && duration > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const ratio = currentX / rect.width;
        seek(ratio * duration);
      }
      setIsDragging(false);
      setScrubTime(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, duration, seek]);

  // Scrubbing & click handlers
  const handleSeekFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetTime = ratio * duration;
    seek(targetTime);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0 || isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = currentX / rect.width;
    setHoverTime(ratio * duration);
  };

  return (
    <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-2 select-none">
      {/* Waveform Header & Time Indicators */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200">
            Biểu Đồ Sóng Âm (Waveform Visualizer)
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            EBU R128 (-16 LUFS)
          </span>
        </div>

        <div className="font-mono text-xs text-slate-400 flex items-center space-x-2">
          {(isHovered || isDragging) && hoverTime !== null && (
            <span className="text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Tua đến: {formatTime(hoverTime)}
            </span>
          )}
          <span>{formatTime(activeTime)}</span>
          <span className="text-slate-600">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Interactive Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleSeekFromEvent}
        onMouseDown={(e) => {
          if (!containerRef.current || duration <= 0) return;
          const rect = containerRef.current.getBoundingClientRect();
          const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const ratio = clickX / rect.width;
          const targetTime = ratio * duration;
          setScrubTime(targetTime);
          setIsDragging(true);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          if (!isDragging) {
            setHoverTime(null);
          }
        }}
        onMouseMove={handleMouseMove}
        className="relative w-full rounded-xl bg-slate-950/80 border border-slate-800/90 overflow-hidden cursor-pointer hover:border-indigo-500/60 transition-colors py-1"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block pointer-events-none"
        />

        {/* Hover preview marker line */}
        {(isHovered || isDragging) && hoverTime !== null && duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-amber-400/80 pointer-events-none"
            style={{
              left: `${(hoverTime / duration) * 100}%`,
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>Nhấp hoặc kéo thả chuột trên sóng âm để tua vị trí</span>
        <span>100-Point Normalized Audio Peaks</span>
      </div>
    </div>
  );
}
