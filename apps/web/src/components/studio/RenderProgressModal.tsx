'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { TaskProgressEvent, TaskStatus } from '@meowshadow/types';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Music,
  Layers,
  Wand2,
  ArrowRight,
  X,
} from 'lucide-react';

interface RenderProgressModalProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  targetLessonId?: string;
}

interface StepItem {
  id: TaskStatus;
  label: string;
  desc: string;
  minPercent: number;
}

const STEPS: StepItem[] = [
  {
    id: 'PARSING',
    label: 'Phân đoạn cú pháp thẻ',
    desc: 'Trích xuất các block [VI] và [EN/JA]',
    minPercent: 10,
  },
  {
    id: 'SYNTHESIZING',
    label: 'Tổng hợp giọng nói đa ngữ',
    desc: 'Sinh audio Edge-TTS theo nhịp điệu',
    minPercent: 30,
  },
  {
    id: 'MASTERING',
    label: 'Ghép nối & Chuẩn hóa âm lượng',
    desc: 'Chèn khoảng lặng và chuẩn -16 LUFS',
    minPercent: 85,
  },
  {
    id: 'COMPLETED',
    label: 'Hoàn tất xuất bản',
    desc: 'Tạo phụ đề SRT/VTT và sẵn sàng phát',
    minPercent: 100,
  },
];

export function RenderProgressModal({
  isOpen,
  taskId,
  onClose,
  targetLessonId = 'sample-1',
}: RenderProgressModalProps) {
  const router = useRouter();

  const [status, setStatus] = useState<TaskStatus>('PARSING');
  const [percent, setPercent] = useState<number>(10);
  const [stepMessage, setStepMessage] = useState<string>(
    'Đang phân tích cú pháp thẻ kịch bản song ngữ...'
  );
  const [completedLessonId, setCompletedLessonId] = useState<string>(targetLessonId);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (targetLessonId) {
      setCompletedLessonId(targetLessonId);
    }
  }, [targetLessonId]);

  useEffect(() => {
    if (!isOpen || !taskId) return;

    // Reset state
    setStatus('PARSING');
    setPercent(10);
    setStepMessage('Đang phân tích cú pháp thẻ kịch bản song ngữ...');
    setCompletedLessonId(targetLessonId);
    setError(null);

    let isClosed = false;

    // Real WebSocket subscription for render progress
    const unsubscribeWs = api.ws.subscribeTaskProgress(
      taskId,
      {
        onProgress: (event: TaskProgressEvent) => {
          if (isClosed) return;
          setStatus(event.status);
          setPercent(event.progressPercent);
          if (event.currentStepMessage) {
            setStepMessage(event.currentStepMessage);
          }
          if (event.resultLessonId) {
            setCompletedLessonId(event.resultLessonId);
          }
          if (event.status === 'FAILED') {
            setError(event.error || 'Quá trình render thất bại trên máy chủ.');
          }
        },
        onComplete: (lessonId: string) => {
          if (isClosed) return;
          setStatus('COMPLETED');
          setPercent(100);
          setStepMessage('Quá trình render âm thanh hoàn tất 100%!');
          setCompletedLessonId(lessonId || targetLessonId);
        },
        onError: (err) => {
          if (isClosed) return;
          console.warn('WebSocket subscription issue:', err);
        },
      },
      targetLessonId
    );

    // Polling fallback to ensure completion is detected even if WebSocket is interrupted
    const pollInterval = setInterval(async () => {
      if (isClosed) return;
      try {
        const lessonRes = await api.lessons.getById(targetLessonId);
        if (lessonRes.data && !isClosed) {
          const l = lessonRes.data;
          if (l.durationSec && l.durationSec > 0) {
            setStatus('COMPLETED');
            setPercent(100);
            setStepMessage('Quá trình render âm thanh hoàn tất 100%!');
            setCompletedLessonId(l.id || targetLessonId);
          }
        }
      } catch {
        // Silent catch during ongoing render polling
      }
    }, 2500);

    return () => {
      isClosed = true;
      clearInterval(pollInterval);
      unsubscribeWs();
    };
  }, [isOpen, taskId, targetLessonId]);

  if (!isOpen) return null;

  const handleGoToPlayer = () => {
    onClose();
    router.push(`/lessons/${completedLessonId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl glass-panel border border-indigo-500/40 p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Tiến Trình Render Âm Thanh
              </h3>
              <p className="text-xs text-slate-400">
                WebSocket Realtime Hub • ID: <span className="font-mono text-indigo-300">{taskId?.slice(-8)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center space-x-1.5">
              {status !== 'COMPLETED' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
              <span>{stepMessage}</span>
            </span>
            <span className="text-indigo-400 font-mono text-sm">{percent}%</span>
          </div>

          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-glow"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Stepper Stages */}
        <div className="space-y-2.5 pt-1">
          {STEPS.map((step, idx) => {
            const isDone = percent >= step.minPercent;
            const isCurrent =
              percent < step.minPercent &&
              (idx === 0 || percent >= STEPS[idx - 1].minPercent);

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border transition-all flex items-center space-x-3 ${
                  isDone
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-200'
                    : isCurrent
                    ? 'bg-slate-900/90 border-indigo-500/60 shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isDone
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : isCurrent
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-900 text-slate-600 border border-slate-800'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white">
                    {step.label}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification Banner if Failed */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button on Complete or Failure */}
        <div className="pt-2">
          {status === 'COMPLETED' ? (
            <button
              type="button"
              onClick={handleGoToPlayer}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
            >
              <Headphones className="w-4 h-4" />
              <span>Vào Trình Phát Karaoke Ngay</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          ) : status === 'FAILED' || error ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-all flex items-center justify-center space-x-2"
            >
              <span>Đóng và kiểm tra lại cấu hình</span>
            </button>
          ) : (
            <div className="text-center text-xs text-slate-500 italic py-1">
              Đang tổng hợp... Vui lòng không đóng trình duyệt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
