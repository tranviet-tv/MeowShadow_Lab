'use client';

import React from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import { PACING_PRESETS } from '@/lib/constants';
import { Sliders, Bell, Sparkles, Gauge, Radio, FileAudio } from 'lucide-react';
import type { AudioBitrate, AudioExportFormat } from '@meowshadow/types';

export function PacingController() {
  const {
    targetLanguage,
    pacingConfig,
    updatePacingConfig,
    activePresetId,
    applyPreset,
  } = useStudioStore();

  return (
    <div className="space-y-6">
      {/* 1. Quick Presets Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mẫu Thiết Lập Nhanh (Pacing Presets)</span>
          </span>
          <span className="text-[11px] text-slate-500 font-normal">Chọn 1-click</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PACING_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="font-semibold text-xs text-indigo-300">
                  {preset.title}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Silence Pauses Sliders */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>Khoảng Lặng Shadowing (Silence Intervals)</span>
        </h3>

        {/* Silence after VI */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Lặng sau câu tiếng Việt <strong className="text-emerald-400">[VI]</strong>:
            </span>
            <span className="font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {pacingConfig.silenceAfterViSec.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={pacingConfig.silenceAfterViSec}
            onChange={(e) =>
              updatePacingConfig({ silenceAfterViSec: parseFloat(e.target.value) })
            }
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-600 font-mono">
            <span>0.5s</span>
            <span>Mặc định: 1.5s</span>
            <span>5.0s</span>
          </div>
        </div>

        {/* Silence after Target */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Lặng sau câu ngoại ngữ <strong className="text-sky-400">[{targetLanguage.toUpperCase()}]</strong> (để nhại):
            </span>
            <span className="font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              {pacingConfig.silenceAfterTargetSec.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={pacingConfig.silenceAfterTargetSec}
            onChange={(e) =>
              updatePacingConfig({ silenceAfterTargetSec: parseFloat(e.target.value) })
            }
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-600 font-mono">
            <span>1.0s</span>
            <span>Khuyên dùng: 3.5s</span>
            <span>10.0s</span>
          </div>
        </div>

        {/* Silence between sentence pairs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Khoảng nghỉ giữa các câu:</span>
            <span className="font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {pacingConfig.silenceBetweenSentencesSec.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="2.0"
            step="0.1"
            value={pacingConfig.silenceBetweenSentencesSec}
            onChange={(e) =>
              updatePacingConfig({
                silenceBetweenSentencesSec: parseFloat(e.target.value),
              })
            }
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-600 font-mono">
            <span>0.0s</span>
            <span>0.5s</span>
            <span>2.0s</span>
          </div>
        </div>
      </div>

      {/* 3. Speed Rates & Cue Sound */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
          <Gauge className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tốc Độ Phát Âm & Hiệu Ứng</span>
        </h3>

        {/* VI Speed */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tốc độ Tiếng Việt [VI]:</span>
            <span className="font-bold text-indigo-300 font-mono">
              {pacingConfig.viSpeed.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={pacingConfig.viSpeed}
            onChange={(e) =>
              updatePacingConfig({ viSpeed: parseFloat(e.target.value) })
            }
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Target Speed */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tốc độ Ngoại ngữ [{targetLanguage.toUpperCase()}]:</span>
            <span className="font-bold text-indigo-300 font-mono">
              {pacingConfig.targetSpeed.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={pacingConfig.targetSpeed}
            onChange={(e) =>
              updatePacingConfig({ targetSpeed: parseFloat(e.target.value) })
            }
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Cue Chime Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center space-x-2">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <div className="text-xs font-semibold text-slate-300">
                Tiếng chuông chuyển ngữ [CUE]
              </div>
              <div className="text-[10px] text-slate-500">
                Phát âm thanh nhẹ báo hiệu chuyển đổi ngôn ngữ
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updatePacingConfig({ insertCueSound: !pacingConfig.insertCueSound })
            }
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              pacingConfig.insertCueSound ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                pacingConfig.insertCueSound ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Audio Format & Bitrate Selection */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
          <FileAudio className="w-3.5 h-3.5 text-amber-400" />
          <span>Định Dạng Xuất Bản & Chất Lượng Âm Thanh</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Format */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Định dạng file:</label>
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
              {(['mp3', 'wav'] as AudioExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updatePacingConfig({ exportFormat: fmt })}
                  className={`flex-1 py-1 text-xs font-semibold uppercase rounded ${
                    pacingConfig.exportFormat === fmt
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Bitrate âm thanh:</label>
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
              {(['128k', '192k', '320k'] as AudioBitrate[]).map((br) => (
                <button
                  key={br}
                  type="button"
                  onClick={() => updatePacingConfig({ audioBitrate: br })}
                  className={`flex-1 py-1 text-xs font-semibold rounded ${
                    pacingConfig.audioBitrate === br
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {br}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
