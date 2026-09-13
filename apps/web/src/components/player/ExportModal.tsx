'use client';

import React, { useState } from 'react';
import {
  Download,
  FileAudio,
  FileText,
  Archive,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

interface ExportOption {
  format: 'mp3' | 'srt' | 'vtt' | 'zip';
  title: string;
  extension: string;
  description: string;
  badge: string;
  icon: typeof FileAudio;
  colorClass: string;
  sizeEstimate: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'mp3',
    title: 'Audio Mastered MP3',
    extension: '.mp3',
    description: 'Âm thanh chuẩn -16 LUFS, 192kbps, đã ghép nối khoảng lặng Shadowing',
    badge: 'Audio Chuẩn',
    icon: FileAudio,
    colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    sizeEstimate: '~3.2 MB',
  },
  {
    format: 'srt',
    title: 'Phụ Đề Chuẩn SRT',
    extension: '.srt',
    description: 'Dành cho CapCut, Premiere Pro, VLC Player với mốc thời gian chuẩn xác',
    badge: 'Subtitles',
    icon: FileText,
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    sizeEstimate: '~4.5 KB',
  },
  {
    format: 'vtt',
    title: 'Phụ Đề WebVTT',
    extension: '.vtt',
    description: 'Chuẩn phụ đề web native HTML5 Video/Audio player',
    badge: 'Web Native',
    icon: FileText,
    colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    sizeEstimate: '~4.8 KB',
  },
  {
    format: 'zip',
    title: 'Trọn Gói Bài Học ZIP',
    extension: '.zip',
    description: 'Bao gồm Audio MP3 + Phụ đề SRT + Phụ đề VTT + File kịch bản JSON',
    badge: 'Tất Cả Trong 1',
    icon: Archive,
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    sizeEstimate: '~3.3 MB',
  },
];

export function ExportModal({
  isOpen,
  lessonId,
  lessonTitle,
  onClose,
}: ExportModalProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadedFormats, setDownloadedFormats] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleDownload = (format: 'mp3' | 'srt' | 'vtt' | 'zip') => {
    setDownloadingFormat(format);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const downloadUrl = `${baseUrl}/api/v1/lessons/${lessonId}/export?format=${format}`;

    // Create invisible anchor tag to trigger browser file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute(
      'download',
      `${lessonTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`
    );
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingFormat(null);
      setDownloadedFormats((prev) => ({ ...prev, [format]: true }));
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl glass-panel border border-indigo-500/30 p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Xuất Trọn Gói Tài Liệu (Export Hub)
              </h3>
              <p className="text-xs text-slate-400">
                Tải file bài học chất lượng cao để luyện nghe ngoại tuyến
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

        {/* Audio Spec Badges */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chuẩn Mastering:</span>
            <strong className="text-slate-200">EBU R128 (-16 LUFS)</strong>
          </div>
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300">44.1 kHz</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300">192 kbps</span>
          </div>
        </div>

        {/* Export Options Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isDownloading = downloadingFormat === opt.format;
            const isDownloaded = downloadedFormats[opt.format];

            return (
              <div
                key={opt.format}
                onClick={() => handleDownload(opt.format)}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/60 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`p-2 rounded-xl border flex items-center justify-center ${opt.colorClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      {opt.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {opt.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      {opt.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {opt.sizeEstimate}
                  </span>
                  <button
                    type="button"
                    className="flex items-center space-x-1.5 font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
                  >
                    {isDownloaded ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Đã tải</span>
                      </>
                    ) : isDownloading ? (
                      <span>Đang tải...</span>
                    ) : (
                      <>
                        <span>Tải về</span>
                        <Download className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom footer notice */}
        <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Tài liệu tương thích tốt với mọi thiết bị di động, máy nghe nhạc và phần mềm dựng phim.</span>
        </div>
      </div>
    </div>
  );
}
