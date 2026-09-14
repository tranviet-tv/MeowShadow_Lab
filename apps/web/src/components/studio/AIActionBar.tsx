'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import { SAMPLE_RAW_TEXT } from '@/lib/constants';
import {
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

export function AIActionBar() {
  const {
    targetLanguage,
    setScriptContent,
    rawInputText,
    setRawInputText,
  } = useStudioStore();

  const [isOpen, setIsOpen] = useState(false);
  const [sentencesPerChunk, setSentencesPerChunk] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  /**
   * Handles AI Auto-chunk and translate action.
   */
  const handleAutoChunk = async () => {
    const textToProcess = rawInputText.trim() || SAMPLE_RAW_TEXT;
    if (!textToProcess) return;

    setLoading(true);
    setStatusMessage(
      textToProcess.length > 300
        ? 'Đang kết nối Script-LLM phân đoạn & dịch văn bản dài (có thể mất 10-25s)...'
        : 'Đang kết nối Script-LLM phân đoạn & dịch song ngữ...'
    );

    try {
      const res = await fetch('/api/ai/auto-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: textToProcess,
          targetLang: targetLanguage,
          sentencesPerChunk,
        }),
      });

      const data = await res.json();

      if (data.success && data.formatted_script) {
        setScriptContent(data.formatted_script);
        if (data.is_fallback) {
          setStatusMessage(
            `⚠️ Đã phân đoạn ${data.pairs?.length || 3} câu tiếng Việt. Hãy dùng nút "✨ Dịch AI" trên từng thẻ câu để hoàn tất.`
          );
          setTimeout(() => {
            setStatusMessage(null);
            setIsOpen(false);
          }, 6000);
        } else {
          setStatusMessage(
            `✨ Hoàn tất! Đã dịch và tạo ${data.pairs?.length || 3} cặp câu song ngữ thành công.`
          );
          setTimeout(() => {
            setStatusMessage(null);
            setIsOpen(false);
          }, 3200);
        }
      } else {
        setStatusMessage(data.error || 'Có lỗi xảy ra khi phân đoạn văn bản, vui lòng thử lại.');
      }
    } catch {
      setStatusMessage('Lỗi kết nối dịch vụ AI hoặc yêu cầu bị quá thời gian chờ.');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleText = () => {
    setRawInputText(SAMPLE_RAW_TEXT);
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 overflow-hidden shadow-glow">
      {/* Top Banner Button */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                AI Auto-Translate & Chunk
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/30 text-indigo-300 rounded-full border border-indigo-400/30">
                1-Click Magic
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dán bài viết thô, AI tự động phân đoạn và dịch thành các cặp câu Shadowing chuẩn
            </p>
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all flex items-center space-x-1.5"
          >
            <span>{isOpen ? 'Thu gọn' : 'Dán bài viết thô'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleAutoChunk}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý AI...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Phân đoạn tự động</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Input Drawer */}
      {isOpen && (
        <div className="p-4 border-t border-indigo-500/20 bg-slate-950/70 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Văn bản tiếng Việt thô (Raw Article / Essay / Transcript):</span>
            </label>
            <button
              type="button"
              onClick={loadSampleText}
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center space-x-1 font-medium"
            >
              <span>Nạp văn bản mẫu</span>
            </button>
          </div>

          <textarea
            value={rawInputText}
            onChange={(e) => setRawInputText(e.target.value)}
            placeholder="Dán toàn bộ bài báo, đoạn văn bản tiếng Việt hoặc ghi chú của bạn vào đây..."
            rows={4}
            className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed placeholder:text-slate-600 resize-y"
          />

          {/* Controls inside drawer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>Độ dài mỗi phân đoạn:</span>
              <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSentencesPerChunk(count)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      sentencesPerChunk === count
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {count} câu
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoChunk}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/25 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang phân đoạn...</span>
                </>
              ) : (
                <>
                  <span>Tiến hành dịch & phân đoạn sang [{targetLanguage.toUpperCase()}]</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Realtime Status Banner */}
      {statusMessage && (
        <div className="px-4 py-2 bg-emerald-500/15 border-t border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
