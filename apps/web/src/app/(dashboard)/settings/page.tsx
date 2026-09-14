'use client';

// Settings & System Presets Page
// English comments only per project rules

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Save,
  Volume2,
  Sparkles,
  Layers,
  Radio,
  Clock,
} from 'lucide-react';
import { useStudioStore } from '@/stores/useStudioStore';
import {
  AVAILABLE_VOICES,
  DEFAULT_PACING_CONFIG,
  PACING_PRESETS,
  SAMPLE_TAGGED_SCRIPT,
  type PacingPreset,
} from '@/lib/constants';
import { resetApiClient } from '@/lib/api';
import type { AudioBitrate, AudioExportFormat } from '@meowshadow/types';

interface ServiceStatus {
  name: string;
  url: string;
  port: number;
  status: 'checking' | 'online' | 'offline';
  latencyMs?: number;
}

export default function SettingsPage() {
  const { pacingConfig, updatePacingConfig, activePresetId, applyPreset } = useStudioStore();

  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8000');
  const [scriptLlmUrl, setScriptLlmUrl] = useState('http://localhost:8001');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Load custom persisted endpoints from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGateway = localStorage.getItem('msl_gateway_url');
      if (savedGateway) setGatewayUrl(savedGateway);
      const savedLlm = localStorage.getItem('msl_script_llm_url');
      if (savedLlm) setScriptLlmUrl(savedLlm);
    }
  }, []);

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Gateway Core (API & Streaming)',
      url: 'http://localhost:8000/health',
      port: 8000,
      status: 'checking',
    },
    {
      name: 'Script-LLM Service (FastAPI Ollama)',
      url: 'http://localhost:8001/health',
      port: 8001,
      status: 'checking',
    },
    {
      name: 'TTS Engine Service (Edge-TTS / Kokoro)',
      url: 'http://localhost:8002/health',
      port: 8002,
      status: 'checking',
    },
    {
      name: 'Audio Processor & Pacing Service',
      url: 'http://localhost:8003/health',
      port: 8003,
      status: 'checking',
    },
  ]);

  // Check health status of local backend services
  const checkHealth = async () => {
    const updated = await Promise.all(
      services.map(async (svc) => {
        const start = performance.now();
        try {
          const res = await fetch(svc.url, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
          });
          const latency = Math.round(performance.now() - start);
          if (res.ok) {
            return { ...svc, status: 'online' as const, latencyMs: latency };
          }
          return { ...svc, status: 'offline' as const };
        } catch {
          return { ...svc, status: 'offline' as const };
        }
      })
    );
    setServices(updated);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('msl_gateway_url', gatewayUrl.trim());
      localStorage.setItem('msl_script_llm_url', scriptLlmUrl.trim());
      localStorage.setItem('msl_pacing_config', JSON.stringify(pacingConfig));
      resetApiClient();
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('msl_access_token');
      localStorage.removeItem('msl_gateway_url');
      localStorage.removeItem('msl_script_llm_url');
      localStorage.removeItem('msl_pacing_config');
      sessionStorage.clear();
      resetApiClient();
      // Reset studio content to default sample script
      useStudioStore.getState().setScriptContent(SAMPLE_TAGGED_SCRIPT);
      setGatewayUrl('http://localhost:8000');
      setScriptLlmUrl('http://localhost:8001');
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu Hình & Hệ Thống Presets</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Quản Lý Tham Số & Môi Trường Làm Việc
          </h1>
          <p className="text-xs text-slate-400">
            Điều chỉnh kết nối dịch vụ backend, nhịp điệu mặc định và thiết lập xuất bản âm thanh
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Cấu Hình</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Đã lưu các thiết lập cấu hình thành công vào hệ thống.</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Backend Services & Connectivity (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Trạng Thái Kết Nối Dịch Vụ (Microservices)</span>
              </h2>
              <button
                type="button"
                onClick={checkHealth}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors flex items-center space-x-1"
                title="Kiểm tra lại kết nối"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kiểm tra lại</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {services.map((svc) => (
                <div
                  key={svc.name}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {svc.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        :{svc.port}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                      {svc.url}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {svc.status === 'online' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online</span>
                        {svc.latencyMs !== undefined && (
                          <span className="text-[10px] opacity-75 font-mono">({svc.latencyMs}ms)</span>
                        )}
                      </span>
                    ) : svc.status === 'checking' ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium">
                        Đang dò...
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Offline</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Endpoints config inputs */}
            <div className="pt-2 space-y-3 border-t border-slate-800/80">
              <h3 className="text-xs font-semibold text-slate-400">
                Tùy chỉnh Endpoint URL cục bộ:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Gateway API URL:</label>
                  <input
                    type="text"
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Script-LLM Service URL:</label>
                  <input
                    type="text"
                    value={scriptLlmUrl}
                    onChange={(e) => setScriptLlmUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cache & Maintenance */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Dọn Dẹp Bộ Nhớ Đệm & Phiên Đăng Nhập</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Xóa bỏ Access Token, kịch bản tạm thời và bộ nhớ đệm trình duyệt nếu bạn gặp vấn đề đồng bộ.
            </p>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dọn Dẹp Bộ Nhớ Trình Duyệt</span>
            </button>

            {clearSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Đã dọn dẹp toàn bộ bộ nhớ đệm, khôi phục kịch bản mẫu và thiết lập mặc định.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Studio Default Presets & Audio Spec (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Presets Mặc Định Cho Studio</span>
            </h2>

            <div className="space-y-2">
              {PACING_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">
                        {preset.title}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Thông Số Xuất Bản Âm Thanh</span>
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Định dạng mặc định:</label>
                <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
                  {(['mp3', 'wav'] as AudioExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => updatePacingConfig({ exportFormat: fmt })}
                      className={`flex-1 py-1.5 text-xs font-semibold uppercase rounded ${
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

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Bitrate âm thanh:</label>
                <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
                  {(['128k', '192k', '320k'] as AudioBitrate[]).map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => updatePacingConfig({ audioBitrate: br })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded ${
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
      </div>
    </div>
  );
}
