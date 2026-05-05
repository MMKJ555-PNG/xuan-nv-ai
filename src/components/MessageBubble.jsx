import { Hexagon, CheckCheck, Copy, RefreshCw, ThumbsUp, ThumbsDown, Check, Download, X, Maximize2 } from "lucide-react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="dark:bg-[#0c0c10] bg-zinc-100 rounded-xl my-3 overflow-hidden border-[var(--border-subtle)] border shadow-lg dark:shadow-black/20 shadow-zinc-200/50">
      <div className="flex items-center justify-between px-4 py-2.5 dark:bg-white/[0.02] bg-zinc-50 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5"><span className="size-2.5 rounded-full bg-red-500/70" /><span className="size-2.5 rounded-full bg-amber-400/70" /><span className="size-2.5 rounded-full bg-emerald-400/70" /></div>
          {lang && <span className="text-[10px] font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">{lang}</span>}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all duration-200 active:scale-95 ${copied ? "bg-emerald-500/10 text-emerald-400" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-200"}`}
        >{copied ? <Check size={11} /> : <Copy size={11} />}<span>{copied ? "已复制" : "复制"}</span></button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed font-mono dark:text-zinc-300 text-zinc-700"><code>{code}</code></pre>
    </div>
  );
}

function getRatioStyle(r) { return { aspectRatio: r || "1/1" }; }

function downloadImage(imgEl, fallbackUrl) {
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
      a.download = fallbackUrl.split("/").pop()?.split("?")[0] || "image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, "image/png");
  } catch {
    const a = document.createElement("a");
    a.href = fallbackUrl;
    a.download = fallbackUrl.split("/").pop()?.split("?")[0] || "image.png";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function ImageBlock({ src, alt, ratio }) {
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState(false);
  const previewImgRef = useRef(null);
  return (
    <>
      <div className="my-3 relative group cursor-zoom-in w-full overflow-hidden rounded-xl border-[var(--border-subtle)] border" style={getRatioStyle(ratio)} onClick={() => loaded && setPreview(true)}>
        <img src={src} alt={alt || "Generated image"}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${loaded ? "group-hover:brightness-90" : ""}`}
          onLoad={() => setLoaded(true)} />
        {loaded && <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center"><Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" /></div>}
        {!loaded && <div className="absolute inset-0 rounded-xl dark:bg-white/[0.02] bg-zinc-100 border-[var(--border-subtle)] border flex items-center justify-center"><span className="text-xs dark:text-zinc-500 text-zinc-500">加载图片中...</span></div>}
      </div>

      {preview && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 animate-message-in" onClick={() => setPreview(false)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
          <div className="relative z-10 flex flex-col items-center max-w-[92vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              ref={previewImgRef}
              src={src}
              alt={alt || "预览"}
              className="max-w-[88vw] max-h-[72vh] rounded-2xl object-contain shadow-2xl shadow-black/60 ring-1 ring-white/5"
            />
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => downloadImage(previewImgRef.current, src)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-semibold transition-all duration-200 active:scale-95 shadow-xl shadow-black/40"
              >
                <Download size={18} />
                下载图片
              </button>
              <button
                onClick={() => setPreview(false)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200 active:scale-95 backdrop-blur-sm"
              >
                <X size={18} />
                关闭
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function CanvasPlaceholder({ ratio }) {
  return (
    <div className="my-3 relative w-full overflow-hidden rounded-xl" style={getRatioStyle(ratio)}>
      <div className="absolute inset-0 dark:bg-white/[0.02] bg-zinc-100 border-[var(--border-subtle)] border flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 shimmer" />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="size-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"><div className="size-4 rounded-sm bg-violet-400/30 animate-pulse" /></div>
          <span className="text-xs dark:text-zinc-500 text-zinc-500">生成中...</span>
        </div>
      </div>
    </div>
  );
}

function renderContent(text, ratio) {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) return <ImageBlock key={i} alt={imgMatch[1]} src={imgMatch[2]} ratio={ratio} />;
    const urlMatch = part.match(/^https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?$/i);
    if (urlMatch) return <ImageBlock key={i} src={urlMatch[0]} ratio={ratio} />;
    const segments = part.split(/(```[\s\S]*?```)/g);
    return segments.map((seg, j) => {
      if (seg.startsWith("```") && seg.endsWith("```")) {
        const lines = seg.split("\n"); const lang = lines[0].replace("```", "").trim(); const code = lines.slice(1, -1).join("\n");
        return <CodeBlock key={`${i}-${j}`} code={code} lang={lang} />;
      }
      const paragraphs = seg.split("\n\n").filter((p) => p.trim());
      return paragraphs.map((p, k) => {
        const lines = p.split("\n"); const nonEmpty = lines.filter((l) => l.trim());
        if (nonEmpty.length === 0) return null;
        if (nonEmpty.every((l) => /^[•\-\d+]\.?\s/.test(l.trim()))) {
          return <ul key={`${i}-${j}-${k}`} className="space-y-1.5 my-2">
            {nonEmpty.map((l, m) => <li key={m} className="flex gap-2.5 text-sm dark:text-zinc-200 text-zinc-700 leading-relaxed"><span className="text-violet-400 shrink-0 mt-px">•</span><span>{l.replace(/^[•\-\d]+[.、]?\s*/, "")}</span></li>)}
          </ul>;
        }
        return <p key={`${i}-${j}-${k}`} className="text-sm dark:text-zinc-200 text-zinc-700 leading-relaxed">{p}</p>;
      });
    });
  });
}

export default function MessageBubble({ message, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[78%] bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 rounded-2xl rounded-br-md px-5 py-3.5 shadow-lg shadow-violet-500/20">
          {message.images?.length > 0 && (
            <div className="flex gap-1.5 mb-2.5 flex-wrap">
              {message.images.map((img, i) => (
                <div key={i} className="relative size-16 rounded-lg overflow-hidden border border-white/20 shrink-0">
                  <img src={img} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          )}
          {message.content && <p className="text-sm text-white leading-relaxed">{message.content}</p>}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] dark:text-zinc-500 text-zinc-500">
          <span>{message.time}</span>
          <button onClick={handleCopy} className={`p-1 rounded transition-all duration-150 active:scale-90 ${copied ? "text-emerald-400" : "dark:hover:text-zinc-300 hover:text-zinc-700"}`}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
          <CheckCheck size={12} className="text-violet-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="size-8 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shrink-0 ring-1 ring-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.1)]">
        <Hexagon size={18} className="text-violet-400" strokeWidth={1.5} fill="currentColor" fillOpacity={0.1} />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="max-w-[82%] rounded-2xl rounded-bl-md px-5 py-3.5 relative"
          style={{ background: "var(--surface-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid var(--border-subtle)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <div className="absolute inset-0 rounded-2xl rounded-bl-md bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          <div className="relative">{message.content ? renderContent(message.content, message.ratio) : isStreaming ? <CanvasPlaceholder ratio={message.ratio} /> : <span className="dark:text-zinc-500 text-zinc-500 italic text-sm">...</span>}</div>
        </div>
        <div className="flex items-center gap-1 mt-1.5 px-1">
          <button onClick={handleCopy} className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 ${copied ? "text-emerald-400 bg-emerald-500/10" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-200"}`}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          <button className="p-1.5 rounded-lg dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-200 transition-all duration-150 active:scale-90"><RefreshCw size={14} /></button>
          <button onClick={() => { setLiked(!liked); if (disliked) setDisliked(false); }} className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 ${liked ? "text-violet-400 bg-violet-500/10" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-200"}`}><ThumbsUp size={14} /></button>
          <button onClick={() => { setDisliked(!disliked); if (liked) setLiked(false); }} className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 ${disliked ? "text-red-400 bg-red-500/10" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-200"}`}><ThumbsDown size={14} /></button>
        </div>
      </div>
    </div>
  );
}
