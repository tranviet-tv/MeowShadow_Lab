'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import { AVAILABLE_VOICES, type VoiceOption } from '@/lib/constants';
import { Volume2, VolumeX, Mic, CheckCircle2, Sparkles, User, UserCheck } from 'lucide-react';

export function VoiceSelector() {
  const {
    targetLanguage,
    pacingConfig,
    updatePacingConfig,
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'target' | 'vi'>('target');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Stop speech synthesis when unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const viVoices = AVAILABLE_VOICES.filter((v) => v.lang === 'vi');
  const targetVoices = AVAILABLE_VOICES.filter((v) => v.lang === targetLanguage);

  const selectedViVoice = viVoices.find((v) => v.id === pacingConfig.viVoice) || viVoices[0];
  const selectedTargetVoice =
    targetVoices.find((v) => v.id === pacingConfig.targetVoice) || targetVoices[0];

  /**
   * Previews sample audio speech for the selected voice.
   */
  const playVoicePreview = (voice: VoiceOption) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (playingVoiceId === voice.id) {
      window.speechSynthesis.cancel();
      setPlayingVoiceId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingVoiceId(voice.id);

    const utterance = new SpeechSynthesisUtterance(voice.previewSampleText);
    if (voice.lang === 'vi') utterance.lang = 'vi-VN';
    else if (voice.lang === 'ja') utterance.lang = 'ja-JP';
    else utterance.lang = 'en-US';

    // Apply speed from pacing config
    utterance.rate = voice.lang === 'vi' ? pacingConfig.viSpeed : pacingConfig.targetSpeed;

    utterance.onend = () => setPlayingVoiceId(null);
    utterance.onerror = () => setPlayingVoiceId(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher between Target Language Voice & VI Voice */}
      <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('target')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'target'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>
            Giọng Ngoại Ngữ [{targetLanguage.toUpperCase()}]
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-normal">
            {selectedTargetVoice?.name.split(' ')[0]}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vi')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'vi'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Giọng Tiếng Việt [VI]</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-normal">
            {selectedViVoice?.name.split(' ')[0]}
          </span>
        </button>
      </div>

      {/* Voice List for Active Tab */}
      <div className="space-y-2.5">
        {(activeTab === 'target' ? targetVoices : viVoices).map((voice) => {
          const isSelected =
            activeTab === 'target'
              ? pacingConfig.targetVoice === voice.id
              : pacingConfig.viVoice === voice.id;

          const isPlaying = playingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => {
                if (activeTab === 'target') {
                  updatePacingConfig({ targetVoice: voice.id });
                } else {
                  updatePacingConfig({ viVoice: voice.id });
                }
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm shadow-indigo-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/90'
              }`}
            >
              {/* Left Voice Info */}
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {voice.gender === 'female' ? (
                    <User className="w-4 h-4 text-pink-300" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-blue-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-white truncate">
                      {voice.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        voice.gender === 'female'
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {voice.gender === 'female' ? 'Nữ' : 'Nam'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {voice.accent} • {voice.engine.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Right Action: Preview & Select Status */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playVoicePreview(voice);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                    isPlaying
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                  title="Nghe thử giọng này"
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                      <span className="text-[11px]">Đang đọc...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px]">Nghe thử</span>
                    </>
                  )}
                </button>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'text-indigo-400' : 'text-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
