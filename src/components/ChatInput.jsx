import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, Sparkles, Zap, ImagePlus, X, Braces, Wrench, Brain, Video, Check } from "lucide-react";

const FEATURES = [
  { key: "structuredOutput", label: "结构化输出", icon: Braces, desc: "JSON Schema 约束输出" },
  { key: "toolCalling", label: "工具调用", icon: Wrench, desc: "启用 Function Calling" },
  { key: "thinking", label: "深度思考", icon: Brain, desc: "Claude extended thinking" },
];

export default function ChatInput({ onSend, activeModel, variant = "compact", features, onFeaturesChange, mode = "text" }) {
  const [input, setInput] = useState("");
  const [featureOpen, setFeatureOpen] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [images, setImages] = useState([]);
  const textareaRef = useRef(null);
  const featureContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (featureContainerRef.current && !featureContainerRef.current.contains(e.target)) setFeatureOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }
  };

  const handleSend = () => {
    if (!input.trim() && images.length === 0 && !(features.video && videoFile)) return;
    onSend(input.trim(), images, { videoUrl: features.video && videoFile ? videoFile.dataUrl : "", features });
    setInput("");
    setImages([]);
    setVideoFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("video/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setVideoFile({ name: file.name, dataUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
  };

  const hasContent = input.trim().length > 0 || images.length > 0 || (features.video && videoFile);
  const activeFeatures = FEATURES.filter((f) => features[f.key]);
  const isHero = variant === "hero";
  const isVideoMode = mode === "text" && features.video;
  const showFeatures = mode === "text";

  return (
    <>
      <div className={`${isHero ? "w-full max-w-2xl mx-auto" : "px-4 pb-5 max-w-3xl mx-auto w-full"}`}>
        <div className={`${isHero ? "rounded-3xl shadow-xl shadow-violet-500/10" : "rounded-2xl shadow-[var(--input-shadow)]"} dark:bg-zinc-900/70 bg-white/95 border-[var(--surface-glass-border)] border backdrop-blur-xl`}>
          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 px-4 pt-3 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative size-14 rounded-lg overflow-hidden border border-[var(--border-subtle)] group/img shrink-0">
                  <img src={img} alt="" className="size-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  ><X size={10} className="text-white" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="overflow-hidden rounded-t-2xl">
            <textarea ref={textareaRef} value={input}
              onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
              onKeyDown={handleKeyDown}
              placeholder={isHero ? (isVideoMode ? "上传视频文件，描述你想了解的内容，Enter 发送..." : "输入消息，Enter 发送，Shift+Enter 换行") : (isVideoMode ? "上传视频并描述问题..." : "输入消息，Enter 发送，Shift+Enter 换行...")}
              rows={isHero ? 1 : 1}
              className={`w-full bg-transparent dark:text-white text-zinc-900 dark:placeholder-zinc-500/70 placeholder-zinc-500/70 outline-none resize-none px-4 pt-4 pb-2 min-h-[52px] leading-relaxed block ${isHero ? "text-base min-h-[64px] px-5 pt-5 pb-3" : "text-sm"}`}
            />
          </div>
          {/* Video file upload */}
          {isVideoMode && (
            <div className={`px-4 pb-2 ${isHero ? "px-5" : ""}`}>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              {videoFile && (
                <div className="flex items-center gap-2 bg-violet-500/10 rounded-lg px-3 py-2">
                  <Video size={14} className="text-violet-400 shrink-0" />
                  <span className="flex-1 text-xs dark:text-zinc-300 text-zinc-700 truncate">{videoFile.name}</span>
                  <button onClick={handleRemoveVideo} className="size-5 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors">
                    <X size={10} className="text-white" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className={`flex items-center justify-between gap-2 ${isHero ? "px-4 pb-4" : "px-3 pb-3"}`}>
            {showFeatures ? (
              <div className="relative" ref={featureContainerRef}>
                <button onClick={() => setFeatureOpen(!featureOpen)}
                  className={`flex items-center gap-1.5 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border rounded-lg text-xs dark:text-zinc-300 text-zinc-700 transition-all duration-200 active:scale-95 ${isHero ? "pl-4 pr-3 py-2 text-sm" : "pl-3 pr-2 py-1.5"}`}
                >
                  <Sparkles size={isHero ? 14 : 12} className="text-violet-400 shrink-0" />
                  <span className="font-medium">{activeFeatures.length > 0 ? `${activeFeatures.length} 项功能` : "功能"}</span>
                  <ChevronDown size={isHero ? 13 : 11} className="dark:text-zinc-500 text-zinc-400 shrink-0 transition-transform duration-200 ml-0.5" style={{ transform: featureOpen ? "rotate(180deg)" : "" }} />
                </button>
                {featureOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 dark:bg-zinc-800/95 bg-white/95 backdrop-blur-xl rounded-xl border-[var(--border-default)] border shadow-2xl overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[10px] dark:text-zinc-500 text-zinc-400 uppercase tracking-wider font-medium">文本功能特性</span>
                    </div>
                    <div>
                      {/* Video mode toggle — text mode only */}
                      <button
                        onClick={() => onFeaturesChange({ ...features, video: !features.video })}
                        className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${features.video ? "bg-violet-500/10 border-l-2 border-l-violet-400" : "dark:hover:bg-white/[0.04] hover:bg-zinc-100 border-l-2 border-l-transparent"}`}
                      >
                        <Video size={16} className={features.video ? "text-violet-400" : "dark:text-zinc-500 text-zinc-400"} />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm block truncate ${features.video ? "text-violet-400 font-medium" : "dark:text-zinc-200 text-zinc-700"}`}>视频分析</span>
                          <span className="text-[10px] dark:text-zinc-500 text-zinc-400 block truncate">仅 Gemini 系列模型</span>
                        </div>
                        {features.video && <Check size={14} className="text-violet-400 shrink-0" />}
                      </button>
                      {/* Feature toggles */}
                      {FEATURES.map((f) => {
                        const Icon = f.icon;
                        const active = features[f.key];
                        return (
                          <button
                            key={f.key}
                            onClick={() => onFeaturesChange({ ...features, [f.key]: !active })}
                            className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${active ? "bg-violet-500/10 border-l-2 border-l-violet-400" : "dark:hover:bg-white/[0.04] hover:bg-zinc-100 border-l-2 border-l-transparent"}`}
                          >
                            <Icon size={16} className={active ? "text-violet-400" : "dark:text-zinc-500 text-zinc-400"} />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm block truncate ${active ? "text-violet-400 font-medium" : "dark:text-zinc-200 text-zinc-700"}`}>{f.label}</span>
                              <span className="text-[10px] dark:text-zinc-500 text-zinc-400 block truncate">{f.desc}</span>
                            </div>
                            {active && <Check size={14} className="text-violet-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-1.5">
              {isVideoMode ? (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  title="上传视频文件"
                  className={`rounded-xl flex items-center justify-center transition-all duration-200 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border active:scale-95 ${isHero ? "size-10" : "size-9"}`}
                ><Video size={isHero ? 18 : 16} className="dark:text-zinc-400 text-zinc-500" /></button>
              ) : (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="上传参考图片"
                    className={`rounded-xl flex items-center justify-center transition-all duration-200 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border active:scale-95 ${isHero ? "size-10" : "size-9"}`}
                  ><ImagePlus size={isHero ? 18 : 16} className="dark:text-zinc-400 text-zinc-500" /></button>
                </>
              )}
              <button onClick={handleSend} disabled={!hasContent || !activeModel}
                className={`rounded-xl flex items-center justify-center transition-all duration-200 ${isHero ? "size-10" : "size-9"} ${hasContent && activeModel ? "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/25 animate-pulse-glow" : "dark:bg-white/[0.06] bg-zinc-100 cursor-not-allowed"}`}
              >{hasContent && activeModel ? <Zap size={isHero ? 18 : 16} className="text-white" /> : <Send size={isHero ? 17 : 15} className="dark:text-zinc-500 text-zinc-400" />}</button>
            </div>
          </div>
        </div>
        {!isHero && (
          <p className="text-center text-[10px] dark:text-zinc-600/80 text-zinc-500/80 mt-3 select-none flex items-center justify-center gap-1">
            <span className="inline-block size-1 rounded-full dark:bg-zinc-700 bg-zinc-300" />内容由 AI 生成，仅供参考<span className="inline-block size-1 rounded-full dark:bg-zinc-700 bg-zinc-300" />
          </p>
        )}
      </div>

    </>
  );
}
