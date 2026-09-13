'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStudioStore, type StudioViewMode } from '@/stores/useStudioStore';
import { parseTaggedScript, type ParsedPair } from '@/lib/utils';
import { SAMPLE_TAGGED_SCRIPT } from '@/lib/constants';
import {
  FileText,
  Columns2,
  ListOrdered,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

export function ScriptEditor() {
  const {
    scriptContent,
    setScriptContent,
    targetLanguage,
    viewMode,
    setViewMode,
  } = useStudioStore();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Parse pairs for side-by-side editing
  const { pairs } = useMemo(
    () => parseTaggedScript(scriptContent, targetLanguage),
    [scriptContent, targetLanguage]
  );

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Inserts a tag at the current cursor position in the interleaved textarea.
   */
  const insertTag = (tag: string) => {
    if (!textareaRef.current) {
      setScriptContent(`${scriptContent}\n${tag} `);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const textBefore = scriptContent.substring(0, start);
    const textAfter = scriptContent.substring(end);

    const prefix = start > 0 && !textBefore.endsWith('\n') ? '\n\n' : '';
    const newContent = `${textBefore}${prefix}${tag} ${textAfter}`;
    setScriptContent(newContent);

    setTimeout(() => {
      el.focus();
      const newPos = start + prefix.length + tag.length + 1;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  /**
   * Updates an individual pair in side-by-side mode and regenerates the tagged script.
   */
  const updatePair = (idx: number, field: 'vi' | 'target', value: string) => {
    const updatedPairs = [...pairs];
    if (!updatedPairs[idx]) return;

    updatedPairs[idx] = {
      ...updatedPairs[idx],
      [field]: value,
    };

    rebuildScriptFromPairs(updatedPairs);
  };

  /**
   * Adds a new empty pair in side-by-side mode.
   */
  const addNewPair = () => {
    const newPairs: ParsedPair[] = [
      ...pairs,
      {
        id: `pair-${pairs.length + 1}`,
        order: pairs.length + 1,
        vi: '',
        target: '',
      },
    ];
    rebuildScriptFromPairs(newPairs);
  };

  /**
   * Deletes a pair in side-by-side mode.
   */
  const deletePair = (idx: number) => {
    const filtered = pairs.filter((_, i) => i !== idx);
    rebuildScriptFromPairs(filtered);
  };

  /**
   * Rebuilds the interleaved tagged script string from pairs list.
   */
  const rebuildScriptFromPairs = (pairsList: ParsedPair[]) => {
    const targetTag = targetLanguage.toUpperCase();
    const formatted = pairsList
      .map((p) => `[VI] ${p.vi.trim()}\n[${targetTag}] ${p.target.trim()}`)
      .join('\n\n');
    setScriptContent(formatted);
  };

  /**
   * Previews speech for a sentence using client Web SpeechSynthesis API.
   */
  const playSentenceAudio = (id: string, text: string, lang: 'vi' | 'en' | 'ja') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingId(id);

    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'vi') utterance.lang = 'vi-VN';
    else if (lang === 'ja') utterance.lang = 'ja-JP';
    else utterance.lang = 'en-US';

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetToSample = () => {
    setScriptContent(SAMPLE_TAGGED_SCRIPT);
  };

  return (
    <div className="space-y-4">
      {/* Editor Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('interleaved')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'interleaved'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Xen kẽ thẻ (Interleaved)</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Song song 2 cột (Side-by-side)</span>
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Sao chép kịch bản"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
          <button
            onClick={resetToSample}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Tải kịch bản mẫu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kịch bản mẫu</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Interleaved Tagged Script Editor */}
      {viewMode === 'interleaved' ? (
        <div className="space-y-3">
          {/* Quick Tag Insert Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs text-slate-500 px-1 font-medium">Chèn thẻ:</span>
            <button
              onClick={() => insertTag('[VI]')}
              className="px-2.5 py-1 rounded-md text-xs font-semibold tag-vi hover:opacity-90 transition-opacity flex items-center space-x-1"
            >
              <span>+ [VI]</span>
              <span className="text-[10px] opacity-75 font-normal">Tiếng Việt</span>
            </button>
            <button
              onClick={() => insertTag(`[${targetLanguage.toUpperCase()}]`)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                targetLanguage === 'ja' ? 'tag-ja' : 'tag-en'
              } hover:opacity-90 transition-opacity flex items-center space-x-1`}
            >
              <span>+ [{targetLanguage.toUpperCase()}]</span>
              <span className="text-[10px] opacity-75 font-normal">
                {targetLanguage === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh'}
              </span>
            </button>
            <button
              onClick={() => insertTag('[CUE]')}
              className="px-2.5 py-1 rounded-md text-xs font-semibold tag-cue hover:opacity-90 transition-opacity flex items-center space-x-1"
            >
              <span>+ [CUE]</span>
              <span className="text-[10px] opacity-75 font-normal">Chuông ngắt</span>
            </button>
          </div>

          {/* Textarea with Line Numbers & Modern Styling */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 focus-within:border-indigo-500/80 transition-colors">
            <textarea
              ref={textareaRef}
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="[VI] Nhập câu tiếng Việt ở đây...&#10;[EN] Type target language sentence here..."
              rows={12}
              className="w-full p-4 bg-transparent text-sm font-mono text-slate-200 leading-relaxed resize-y focus:outline-none focus:ring-0 placeholder:text-slate-600"
            />
          </div>

          {/* Real-time Tagged Syntax Highlighting Preview */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Xem trước cú pháp màu sắc (Syntax Preview):</span>
              <span className="text-[11px] text-slate-500">{pairs.length} cặp câu nhận diện được</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pairs.length === 0 ? (
                <div className="text-xs text-slate-600 italic py-2">
                  Chưa có thẻ nào được nhận diện. Hãy chèn thẻ [VI] và [{targetLanguage.toUpperCase()}] để phân đoạn kịch bản.
                </div>
              ) : (
                pairs.map((pair, idx) => (
                  <div
                    key={pair.id || idx}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 space-y-1.5 group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tag-vi flex-shrink-0 mt-0.5">
                          [VI]
                        </span>
                        <p className="text-xs text-emerald-200/90 font-medium leading-relaxed">
                          {pair.vi || <span className="text-slate-600 italic">Trống</span>}
                        </p>
                      </div>
                      {pair.vi && (
                        <button
                          onClick={() => playSentenceAudio(`preview-vi-${idx}`, pair.vi, 'vi')}
                          className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-80 group-hover:opacity-100"
                          title="Nghe thử câu tiếng Việt"
                        >
                          {playingId === `preview-vi-${idx}` ? (
                            <VolumeX className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            targetLanguage === 'ja' ? 'tag-ja' : 'tag-en'
                          } flex-shrink-0 mt-0.5`}
                        >
                          [{targetLanguage.toUpperCase()}]
                        </span>
                        <p className="text-xs text-sky-200/90 font-medium leading-relaxed">
                          {pair.target || <span className="text-slate-600 italic">Trống</span>}
                        </p>
                      </div>
                      {pair.target && (
                        <button
                          onClick={() =>
                            playSentenceAudio(
                              `preview-target-${idx}`,
                              pair.target,
                              targetLanguage as 'en' | 'ja'
                            )
                          }
                          className="p-1 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors opacity-80 group-hover:opacity-100"
                          title="Nghe thử câu ngoại ngữ"
                        >
                          {playingId === `preview-target-${idx}` ? (
                            <VolumeX className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Side-by-side Dual Column Editor */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold text-slate-400 px-1">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Cột 1: Câu Tiếng Việt gốc [VI]</span>
            </div>
            <div className="flex items-center space-x-1.5 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>
                Cột 2: Câu {targetLanguage === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh'} [{targetLanguage.toUpperCase()}]
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {pairs.map((pair, idx) => (
              <div
                key={pair.id || idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/90 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-800/60 pb-1.5">
                  <span className="font-semibold text-slate-400">Cặp câu #{idx + 1}</span>
                  <button
                    onClick={() => deletePair(idx)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Xóa cặp câu này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Left column: Vietnamese */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tag-vi">
                        [VI]
                      </span>
                      {pair.vi && (
                        <button
                          onClick={() => playSentenceAudio(`side-vi-${idx}`, pair.vi, 'vi')}
                          className="text-xs text-slate-400 hover:text-emerald-300 flex items-center space-x-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span className="text-[11px]">Nghe thử</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      value={pair.vi}
                      onChange={(e) => updatePair(idx, 'vi', e.target.value)}
                      placeholder="Nhập câu tiếng Việt..."
                      rows={2}
                      className="w-full p-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Right column: Target Language */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          targetLanguage === 'ja' ? 'tag-ja' : 'tag-en'
                        }`}
                      >
                        [{targetLanguage.toUpperCase()}]
                      </span>
                      {pair.target && (
                        <button
                          onClick={() =>
                            playSentenceAudio(
                              `side-target-${idx}`,
                              pair.target,
                              targetLanguage as 'en' | 'ja'
                            )
                          }
                          className="text-xs text-slate-400 hover:text-sky-300 flex items-center space-x-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span className="text-[11px]">Nghe thử</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      value={pair.target}
                      onChange={(e) => updatePair(idx, 'target', e.target.value)}
                      placeholder={`Nhập câu ${targetLanguage.toUpperCase()}...`}
                      rows={2}
                      className="w-full p-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addNewPair}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-indigo-600/10 hover:border-indigo-500 transition-all flex items-center justify-center space-x-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Cặp Câu Mới</span>
          </button>
        </div>
      )}
    </div>
  );
}
