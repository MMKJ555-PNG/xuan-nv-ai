import { useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Download, RefreshCw, X, AlertTriangle } from "lucide-react";

function downloadImage(imgEl, fallbackUrl, filename) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    canvas.toBlob((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "cover.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, "image/png");
  } catch {
    const a = document.createElement("a");
    a.href = fallbackUrl;
    a.download = filename || "cover.png";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export default function CoverResultCard({ ratioLabel, imageUrl, isGenerating, error, onRegenerate, onRegenerateWithPrompt, regenerating, ratioValue, filename }) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");
  const imgRef = (node) => { if (node) node && (node._imgEl = node); };

  const handleDownload = (e) => {
    e.stopPropagation();
    const el = document.querySelector(`[data-cover-ratio="${ratioValue}"] img`);
    if (el) downloadImage(el, imageUrl, filename || `cover_${ratioLabel.replace(":", "x")}.png`);
  };

  const handleRegenSubmit = () => {
    setRegenOpen(false);
    onRegenerateWithPrompt ? onRegenerateWithPrompt(regenPrompt) : onRegenerate();
    setRegenPrompt("");
  };

  return (
    <>
      <div className={`glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)] transition-all duration-300 ${imageUrl ? "hover:shadow-lg hover:shadow-violet-500/5" : ""}`}>
        {/* Ratio badge */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
          <span className="text-[10px] sm:text-xs font-semibold dark:text-zinc-400 text-zinc-600 uppercase tracking-wider">{ratioLabel}</span>
          {imageUrl && !isGenerating && !error && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">已生成</span>
          )}
          {isGenerating && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">生成中</span>
          )}
          {error && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">失败</span>
          )}
        </div>

        {/* Image area */}
        <div className="relative" style={{ aspectRatio: ratioValue }}>
          {isGenerating ? (
            <div className="absolute inset-0 shimmer flex items-center justify-center">
              <p className="text-xs dark:text-zinc-500 text-zinc-400">AI 正在生成封面...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-500/5">
              <AlertTriangle size={22} className="text-red-400/60" />
              <p className="text-xs text-red-400 px-4 text-center">{error}</p>
            </div>
          ) : imageUrl ? (
            <div
              data-cover-ratio={ratioValue}
              className="absolute inset-0 group/img cursor-zoom-in overflow-hidden"
              onClick={() => setZoomOpen(true)}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt={`封面 ${ratioLabel}`}
                className="w-full h-full object-cover transition-all duration-500"
                onLoad={(e) => { e.target.style.opacity = "1"; }}
                style={{ opacity: 0 }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                <Maximize2 size={18} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs dark:text-zinc-600 text-zinc-400">等待生成</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {imageUrl && !isGenerating && (
          <div className="flex gap-2 px-4 py-2.5">
            <button
              onClick={handleDownload}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-50"
            >
              <Download size={12} />
              下载
            </button>
            <button
              onClick={() => setRegenOpen(!regenOpen)}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={12} className={regenerating ? "animate-spin" : ""} />
              {regenerating ? "生成中..." : "重新生成"}
            </button>
          </div>
        )}

        {error && (
          <div className="flex gap-2 px-4 py-2.5">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95"
            >
              <RefreshCw size={12} />重试
            </button>
          </div>
        )}

        {/* Re-generate prompt input */}
        {regenOpen && (
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                placeholder="输入补充要求（可选）"
                className="flex-1 dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-1.5 text-xs dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors"
                onKeyDown={(e) => { if (e.key === "Enter") handleRegenSubmit(); }}
              />
              <button
                onClick={handleRegenSubmit}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors active:scale-95"
              >生成</button>
            </div>
          </div>
        )}
      </div>

      {/* Zoom modal */}
      {zoomOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-message-in" onClick={() => setZoomOpen(false)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
          <div className="relative z-10 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={imageUrl} alt={`封面 ${ratioLabel}`} className="max-w-[88vw] max-h-[72vh] rounded-2xl object-contain shadow-2xl ring-1 ring-white/5" />
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 transition-colors text-sm font-medium active:scale-95"
              ><Download size={16} />下载原图</button>
              <button
                onClick={() => setZoomOpen(false)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors text-sm active:scale-95"
              ><X size={16} />关闭</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
