import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, Sparkles, Zap, Plus, Trash2, ImagePlus, X } from "lucide-react";

export default function ChatInput({ onSend, models, activeModel, onActiveModelChange, onModelAdd, onModelDelete }) {
  const [input, setInput] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [images, setImages] = useState([]);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setModelOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }
  };

  const handleSend = () => {
    if (!input.trim() && images.length === 0) return;
    onSend(input.trim(), images);
    setInput("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAddModel = () => {
    const trimmedId = newModelId.trim();
    if (!trimmedId) return;
    onModelAdd({ id: trimmedId, name: newModelName.trim() || trimmedId });
    if (!activeModel) onActiveModelChange(trimmedId);
    setNewModelId(""); setNewModelName(""); setManagerOpen(false);
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

  const activeModelObj = models.find((m) => m.id === activeModel);
  const hasContent = input.trim().length > 0 || images.length > 0;

  return (
    <>
      <div className="px-4 pb-5 max-w-3xl mx-auto w-full">
        <div className="rounded-2xl dark:bg-zinc-900/70 bg-white/95 border-[var(--surface-glass-border)] border shadow-[var(--input-shadow)] backdrop-blur-xl">
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
              placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
              rows={1}
              className="w-full bg-transparent text-sm dark:text-white text-zinc-900 dark:placeholder-zinc-500/70 placeholder-zinc-500/70 outline-none resize-none px-4 pt-4 pb-2 min-h-[52px] leading-relaxed block"
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-3 gap-2">
            <div className="relative" ref={containerRef}>
              <button onClick={() => setModelOpen(!modelOpen)}
                className="flex items-center gap-1.5 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border rounded-lg pl-3 pr-2 py-1.5 text-xs dark:text-zinc-300 text-zinc-700 transition-all duration-200 active:scale-95 max-w-[160px]"
              >
                <Sparkles size={12} className="text-violet-400 shrink-0" />
                <span className="font-medium truncate">{activeModelObj ? activeModelObj.name : "选择模型"}</span>
                <ChevronDown size={11} className="dark:text-zinc-500 text-zinc-400 shrink-0 transition-transform duration-200 ml-0.5" style={{ transform: modelOpen ? "rotate(180deg)" : "" }} />
              </button>
              {modelOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 dark:bg-zinc-800/95 bg-white/95 backdrop-blur-xl rounded-xl border-[var(--border-default)] border shadow-2xl overflow-hidden z-50">
                  <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                    <span className="text-[10px] dark:text-zinc-500 text-zinc-400 uppercase tracking-wider font-medium">选择模型</span>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                    {models.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <Sparkles size={20} className="text-zinc-400 mx-auto mb-2" />
                        <p className="text-xs dark:text-zinc-500 text-zinc-400">暂无自定义模型</p>
                      </div>
                    ) : (models.map((m) => (
                      <button key={m.id}
                        onClick={() => { onActiveModelChange(m.id); setModelOpen(false); }}
                        className={`w-full px-4 py-3 text-left transition-colors ${activeModel === m.id ? "bg-violet-500/10 border-l-2 border-l-violet-400" : "dark:hover:bg-white/[0.04] hover:bg-zinc-100 border-l-2 border-l-transparent"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${activeModel === m.id ? "text-violet-400" : "dark:text-zinc-200 text-zinc-700"}`}>{m.name}</span>
                          {activeModel === m.id && <span className="size-1.5 rounded-full bg-violet-400 shrink-0" />}
                        </div>
                        <span className="text-[11px] dark:text-zinc-500 text-zinc-500 mt-0.5 block truncate">{m.id}</span>
                      </button>
                    )))}
                  </div>
                  <div className="border-t border-[var(--border-subtle)]">
                    <button onClick={() => { setModelOpen(false); setManagerOpen(true); }}
                      className="flex items-center gap-1.5 w-full px-4 py-2.5 text-xs dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-white/[0.04] hover:bg-zinc-100 transition-colors"
                    ><Plus size={12} />管理模型</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="上传参考图片"
                className="size-9 rounded-xl flex items-center justify-center transition-all duration-200 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border active:scale-95"
              ><ImagePlus size={16} className="dark:text-zinc-400 text-zinc-500" /></button>
              <button onClick={handleSend} disabled={!hasContent || !activeModel}
                className={`size-9 rounded-xl flex items-center justify-center transition-all duration-200 ${hasContent && activeModel ? "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/25 animate-pulse-glow" : "dark:bg-white/[0.06] bg-zinc-100 cursor-not-allowed"}`}
              >{hasContent && activeModel ? <Zap size={16} className="text-white" /> : <Send size={15} className="dark:text-zinc-500 text-zinc-400" />}</button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] dark:text-zinc-600/80 text-zinc-500/80 mt-3 select-none flex items-center justify-center gap-1">
          <span className="inline-block size-1 rounded-full dark:bg-zinc-700 bg-zinc-300" />内容由 AI 生成，仅供参考<span className="inline-block size-1 rounded-full dark:bg-zinc-700 bg-zinc-300" />
        </p>
      </div>

      {/* Model Manager Modal */}
      {managerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 dark:bg-black/60 bg-black/40 backdrop-blur-sm z-40" onClick={() => setManagerOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] dark:bg-zinc-900/95 bg-white/95 backdrop-blur-xl rounded-2xl border-[var(--border-default)] border shadow-2xl animate-message-in overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">管理模型</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
              {models.length === 0 ? (
                <p className="text-xs dark:text-zinc-500 text-zinc-500 text-center py-8">暂无自定义模型</p>
              ) : (models.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-subtle)] dark:hover:bg-white/[0.02] hover:bg-zinc-50">
                  <div className="flex-1 min-w-0"><p className="text-sm dark:text-zinc-200 text-zinc-700 truncate">{m.name}</p><p className="text-[10px] dark:text-zinc-500 text-zinc-400 truncate">{m.id}</p></div>
                  <button onClick={() => onModelDelete(m.id)} className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                </div>
              )))}
            </div>
            <div className="p-5 space-y-3 dark:bg-white/[0.02] bg-zinc-50 border-t border-[var(--border-subtle)]">
              <div><label className="text-[10px] dark:text-zinc-500 text-zinc-600 mb-1 block">模型 ID *</label>
                <input type="text" value={newModelId} onChange={(e) => setNewModelId(e.target.value)} placeholder="gpt-4o"
                  className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-500 outline-none focus:border-violet-500/40 transition-colors"
                />
              </div>
              <div><label className="text-[10px] dark:text-zinc-500 text-zinc-600 mb-1 block">显示名称（可选）</label>
                <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="GPT-4o"
                  className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-500 outline-none focus:border-violet-500/40 transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddModel(); }}
                />
              </div>
              <button onClick={handleAddModel} disabled={!newModelId.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >添加模型</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
