'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import {
  parseTaggedScript,
  rebuildTaggedScriptFromPairs,
  validateTaggedScript,
  countWords,
  estimateAudioDuration,
  type ParsedPair,
} from '@/lib/utils';
import { SAMPLE_TAGGED_SCRIPT } from '@/lib/constants';
import {
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
  ArrowUp,
  ArrowDown,
  Bell,
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wand2,
  FileCode,
  AlignLeft,
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
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const [singleTranslateError, setSingleTranslateError] = useState<string | null>(null);

  // Parse structured bilingual pairs and validate current script
  const { pairs } = useMemo(
    () => parseTaggedScript(scriptContent, targetLanguage),
    [scriptContent, targetLanguage]
  );

  const validation = useMemo(
    () => validateTaggedScript(scriptContent, targetLanguage),
    [scriptContent, targetLanguage]
  );

  // Stop client audio playback when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Inserts a tag at the current cursor position in the script textarea.
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

    const prefix = start > 0 && !textBefore.endsWith('\n') ? '\n' : '';
    const newContent = `${textBefore}${prefix}${tag} ${textAfter}`;
    setScriptContent(newContent);

    setTimeout(() => {
      el.focus();
      const newPos = start + prefix.length + tag.length + 1;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  /**
   * Auto-formats and aligns spacing between script tags.
   */
  const formatScriptSpacing = () => {
    if (pairs.length === 0) return;
    const formatted = rebuildTaggedScriptFromPairs(pairs, targetLanguage);
    setScriptContent(formatted);
  };

  /**
   * Updates an individual pair's text or cue setting and regenerates the tagged script.
   */
  const updatePair = (
    idx: number,
    field: 'vi' | 'target' | 'hasCue',
    value: string | boolean
  ) => {
    const updatedPairs = [...pairs];
    if (!updatedPairs[idx]) return;

    updatedPairs[idx] = {
      ...updatedPairs[idx],
      [field]: value,
    };

    const newScript = rebuildTaggedScriptFromPairs(updatedPairs, targetLanguage);
    setScriptContent(newScript);
  };

  /**
   * Toggles the language transition chime cue for a specific sentence pair.
   */
  const toggleCue = (idx: number) => {
    if (!pairs[idx]) return;
    updatePair(idx, 'hasCue', !pairs[idx].hasCue);
  };

  /**
   * Appends a new empty pair to the end of the script.
   */
  const addNewPair = () => {
    const newPairs: ParsedPair[] = [
      ...pairs,
      {
        id: `pair-${pairs.length + 1}`,
        order: pairs.length + 1,
        vi: '',
        target: '',
        hasCue: false,
      },
    ];
    setScriptContent(rebuildTaggedScriptFromPairs(newPairs, targetLanguage));
  };

  /**
   * Inserts a new empty pair right below the specified index.
   */
  const insertPairBelow = (idx: number) => {
    const newPairs = [...pairs];
    newPairs.splice(idx + 1, 0, {
      id: `pair-${Date.now()}`,
      order: idx + 2,
      vi: '',
      target: '',
      hasCue: false,
    });
    setScriptContent(rebuildTaggedScriptFromPairs(newPairs, targetLanguage));
  };

  /**
   * Moves a sentence pair up in the sequence.
   */
  const movePairUp = (idx: number) => {
    if (idx <= 0) return;
    const newPairs = [...pairs];
    const temp = newPairs[idx];
    newPairs[idx] = newPairs[idx - 1];
    newPairs[idx - 1] = temp;
    setScriptContent(rebuildTaggedScriptFromPairs(newPairs, targetLanguage));
  };

  /**
   * Moves a sentence pair down in the sequence.
   */
  const movePairDown = (idx: number) => {
    if (idx >= pairs.length - 1) return;
    const newPairs = [...pairs];
    const temp = newPairs[idx];
    newPairs[idx] = newPairs[idx + 1];
    newPairs[idx + 1] = temp;
    setScriptContent(rebuildTaggedScriptFromPairs(newPairs, targetLanguage));
  };

  /**
   * Deletes an individual pair.
   */
  const deletePair = (idx: number) => {
    const filtered = pairs.filter((_, i) => i !== idx);
    setScriptContent(rebuildTaggedScriptFromPairs(filtered, targetLanguage));
  };

  /**
   * Translates an individual sentence pair using Script-LLM translation API.
   */
  const translateSinglePair = async (idx: number) => {
    const pair = pairs[idx];
    if (!pair || !pair.vi.trim()) return;

    setTranslatingIdx(idx);
    setSingleTranslateError(null);

    try {
      const res = await fetch('/api/ai/translate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pair.vi.trim(),
          sourceLang: 'vi',
          targetLang: targetLanguage,
        }),
      });

      const data = await res.json();
      if (data.success && data.translatedText) {
        updatePair(idx, 'target', data.translatedText);
      } else {
        setSingleTranslateError(data.error || 'Dịch không thành công');
        setTimeout(() => setSingleTranslateError(null), 3000);
      }
    } catch {
      setSingleTranslateError('Lỗi kết nối máy chủ dịch thuật');
      setTimeout(() => setSingleTranslateError(null), 3000);
    } finally {
      setTranslatingIdx(null);
    }
  };

  /**
   * Previews spoken audio for a sentence using client Web SpeechSynthesis API.
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

  const clearAll = () => {
    if (pairs.length > 0 && typeof window !== 'undefined') {
      if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ kịch bản hiện tại?')) {
        return;
      }
    }
    setScriptContent('');
  };

  return (
    <div className="space-y-4">
      {/* Editor Header: Mode Switcher & Quick Utilities */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Thẻ Cặp Câu (Interactive Cards)</span>
          </button>
          <button
            onClick={() => setViewMode('interleaved')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'interleaved'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Thẻ Toàn Văn (Syntax Script)</span>
          </button>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Sao chép toàn bộ kịch bản"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>
          <button
            onClick={resetToSample}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Nạp lại kịch bản mẫu chuẩn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mẫu chuẩn</span>
          </button>
          <button
            onClick={clearAll}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-300 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 transition-colors"
            title="Xóa toàn bộ văn bản kịch bản"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa hết</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner for Single Sentence Translation if failed */}
      {singleTranslateError && (
        <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{singleTranslateError}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODE 1: INTERACTIVE BILINGUAL CARDS (Rich, intuitive per-pair editor) */}
      {/* ==================================================================== */}
      {viewMode === 'side-by-side' ? (
        <div className="space-y-4">
          {/* Top Bar Summary */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center space-x-2 font-medium">
              <span className="text-slate-300 font-semibold">{pairs.length} cặp câu song ngữ</span>
              <span>•</span>
              <span>Bảo toàn 100% cấu trúc Shadowing & Chuông ngắt [CUE]</span>
            </div>
            <button
              onClick={addNewPair}
              className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold py-1 px-2 rounded-lg hover:bg-indigo-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm cặp câu</span>
            </button>
          </div>

          {/* List of Bilingual Sentence Pair Cards */}
          <div className="space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
            {pairs.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
                <FileCode className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Kịch bản chưa có câu nào.</p>
                <div className="flex justify-center space-x-3 pt-2">
                  <button
                    onClick={addNewPair}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
                  >
                    Thêm Cặp Câu Mới
                  </button>
                  <button
                    onClick={resetToSample}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
                  >
                    Tải Kịch Bản Mẫu
                  </button>
                </div>
              </div>
            ) : (
              pairs.map((pair, idx) => {
                const viWordCount = countWords(pair.vi);
                const targetWordCount = countWords(pair.target);
                const isOverlyLong = viWordCount > 28 || targetWordCount > 28;
                const estSec = estimateAudioDuration(viWordCount + targetWordCount, 3.5);

                return (
                  <div
                    key={pair.id || idx}
                    className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/80 hover:border-slate-700/90 transition-all space-y-3 shadow-sm group"
                  >
                    {/* Card Header & Sentence Tools */}
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-300">
                          #{idx + 1}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ~{estSec}s • {viWordCount + targetWordCount} từ
                        </span>
                        {isOverlyLong && (
                          <span
                            className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold"
                            title="Câu dài hơn 28 từ. Khuyến nghị tách nhỏ để người học Shadowing không bị đuối hơi."
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Câu dài</span>
                          </span>
                        )}
                      </div>

                      {/* Sentence Pair Actions */}
                      <div className="flex items-center space-x-1 text-slate-400">
                        {/* Toggle CUE Sound */}
                        <button
                          type="button"
                          onClick={() => toggleCue(idx)}
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            pair.hasCue
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-500 hover:text-amber-300 hover:bg-slate-900 border border-transparent'
                          }`}
                          title={pair.hasCue ? 'Đang bật chuông ngắt [CUE]' : 'Bấm để bật chuông ngắt [CUE] sau câu này'}
                        >
                          {pair.hasCue ? (
                            <BellRing className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Bell className="w-3 h-3" />
                          )}
                          <span>[CUE]</span>
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => movePairUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Di chuyển lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => movePairDown(idx)}
                          disabled={idx === pairs.length - 1}
                          className="p-1 rounded hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Di chuyển xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Insert Below */}
                        <button
                          type="button"
                          onClick={() => insertPairBelow(idx)}
                          className="p-1 rounded hover:text-indigo-300 hover:bg-indigo-500/10 text-slate-400"
                          title="Chèn cặp câu mới vào ngay bên dưới"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => deletePair(idx)}
                          className="p-1 rounded hover:text-rose-400 hover:bg-rose-500/10 text-slate-500"
                          title="Xóa cặp câu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Content: 2-Column Responsive Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Left: Vietnamese Sentence */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tag-vi">
                              [VI]
                            </span>
                            <span className="text-emerald-400/90 font-medium">Tiếng Việt</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-500">{viWordCount} từ</span>
                            {pair.vi.trim() && (
                              <button
                                type="button"
                                onClick={() => playSentenceAudio(`card-vi-${idx}`, pair.vi, 'vi')}
                                className="text-slate-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors"
                                title="Nghe thử phát âm tiếng Việt"
                              >
                                {playingId === `card-vi-${idx}` ? (
                                  <VolumeX className="w-3 h-3 text-emerald-400 animate-pulse" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                                <span className="text-[10px]">Nghe thử</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={pair.vi}
                          onChange={(e) => updatePair(idx, 'vi', e.target.value)}
                          placeholder="Nhập câu tiếng Việt gốc..."
                          rows={2}
                          className="w-full p-2.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-colors"
                        />
                      </div>

                      {/* Right: Target Language Sentence */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                targetLanguage === 'ja' ? 'tag-ja' : 'tag-en'
                              }`}
                            >
                              [{targetLanguage.toUpperCase()}]
                            </span>
                            <span className="text-sky-400/90 font-medium">
                              {targetLanguage === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-500">{targetWordCount} từ</span>

                            {/* Single Sentence AI Translate Button */}
                            <button
                              type="button"
                              onClick={() => translateSinglePair(idx)}
                              disabled={translatingIdx === idx || !pair.vi.trim()}
                              className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 flex items-center space-x-1 transition-colors font-medium text-[10px] px-1.5 py-0.5 rounded hover:bg-indigo-500/10"
                              title="Bấm để AI tự động dịch câu này từ tiếng Việt sang ngoại ngữ"
                            >
                              {translatingIdx === idx ? (
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              <span>{translatingIdx === idx ? 'Đang dịch...' : 'Dịch AI'}</span>
                            </button>

                            {/* Audio preview */}
                            {pair.target.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  playSentenceAudio(
                                    `card-target-${idx}`,
                                    pair.target,
                                    targetLanguage as 'en' | 'ja'
                                  )
                                }
                                className="text-slate-400 hover:text-sky-300 flex items-center space-x-1 transition-colors"
                                title="Nghe thử phát âm câu ngoại ngữ"
                              >
                                {playingId === `card-target-${idx}` ? (
                                  <VolumeX className="w-3 h-3 text-sky-400 animate-pulse" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                                <span className="text-[10px]">Nghe thử</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={pair.target}
                          onChange={(e) => updatePair(idx, 'target', e.target.value)}
                          placeholder={`Nhập câu dịch ${targetLanguage.toUpperCase()} hoặc bấm 'Dịch AI'...`}
                          rows={2}
                          className="w-full p-2.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Add Pair Button */}
          <button
            type="button"
            onClick={addNewPair}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-indigo-600/10 hover:border-indigo-500 transition-all flex items-center justify-center space-x-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Cặp Câu Mới</span>
          </button>
        </div>
      ) : (
        /* ==================================================================== */
        /* MODE 2: SYNTAX-HIGHLIGHTED SCRIPT EDITOR (Clean, no duplicate preview) */
        /* ==================================================================== */
        <div className="space-y-3">
          {/* Quick Tag Insert Toolbar & Align Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 px-1 font-medium">Chèn thẻ:</span>
              <button
                type="button"
                onClick={() => insertTag('[VI]')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold tag-vi hover:opacity-90 transition-opacity flex items-center space-x-1"
                title="Chèn thẻ câu tiếng Việt"
              >
                <span>+ [VI]</span>
                <span className="text-[10px] opacity-75 font-normal">Tiếng Việt</span>
              </button>
              <button
                type="button"
                onClick={() => insertTag(`[${targetLanguage.toUpperCase()}]`)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                  targetLanguage === 'ja' ? 'tag-ja' : 'tag-en'
                } hover:opacity-90 transition-opacity flex items-center space-x-1`}
                title="Chèn thẻ câu dịch ngoại ngữ"
              >
                <span>+ [{targetLanguage.toUpperCase()}]</span>
                <span className="text-[10px] opacity-75 font-normal">
                  {targetLanguage === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => insertTag('[CUE]')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold tag-cue hover:opacity-90 transition-opacity flex items-center space-x-1"
                title="Chèn âm thanh chuông ngắt báo hiệu giữa các câu"
              >
                <Bell className="w-3 h-3 text-amber-400" />
                <span>+ [CUE]</span>
                <span className="text-[10px] opacity-75 font-normal">Chuông ngắt</span>
              </button>
            </div>

            <button
              type="button"
              onClick={formatScriptSpacing}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors"
              title="Tự động căn chỉnh khoảng cách giữa các thẻ chuẩn đẹp"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Căn dòng chuẩn</span>
            </button>
          </div>

          {/* Full Script Textarea with Monospace Syntax Focus */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="[VI] Nhập câu tiếng Việt ở đây...&#10;[EN] Type target language sentence here..."
              rows={15}
              className="w-full p-4 bg-transparent text-sm font-mono text-slate-200 leading-relaxed resize-y focus:outline-none focus:ring-0 placeholder:text-slate-600"
            />
          </div>

          {/* Real-time Syntax Status & Quality Inspector (Replaces redundant preview!) */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {validation.isValid ? (
                  <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cú pháp hợp lệ ({validation.pairCount} cặp câu nhận diện được)</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1.5 text-rose-400 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Cú pháp chưa hoàn chỉnh</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500">
                {countWords(scriptContent)} từ • ~{estimateAudioDuration(countWords(scriptContent), validation.pairCount * 4)}s audio
              </div>
            </div>

            {/* Validation Errors */}
            {validation.errors.length > 0 && (
              <div className="space-y-1 pt-1">
                {validation.errors.map((err, i) => (
                  <div key={i} className="text-xs text-rose-300 flex items-start space-x-1.5">
                    <span className="text-rose-400 mt-0.5">•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Validation Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-1 pt-1">
                {validation.warnings.map((warn, i) => (
                  <div key={i} className="text-xs text-amber-300 flex items-start space-x-1.5">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
