import { useState, useRef, useEffect } from "react";
import { MessageCircle, AlertTriangle, Image, Sparkles, MessageSquare, ChevronDown, Plus, Trash2, Video } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { chatCompletionStream, imageGeneration } from "../services/api";

const RATIOS = [
  // 横向 / 横屏比例
  { label: "21:9", value: "21/9" },
  { label: "16:9", value: "16/9" },
  { label: "16:10", value: "16/10" },
  { label: "3:2", value: "3/2" },
  { label: "4:3", value: "4/3" },
  { label: "5:4", value: "5/4" },
  // 方形
  { label: "1:1", value: "1/1" },
  // 纵向 / 竖屏比例
  { label: "4:5", value: "4/5" },
  { label: "3:4", value: "3/4" },
  { label: "2:3", value: "2/3" },
  { label: "10:16", value: "10/16" },
  { label: "9:16", value: "9/16" },
  { label: "9:21", value: "9/21" },
];

function toApiMessages(messages) {
  return messages.map((msg) => {
    if (msg.role === "user") {
      const parts = [];
      if (msg.content) parts.push({ type: "text", text: msg.content });
      if (msg.images?.length > 0) {
        msg.images.forEach((img) => parts.push({ type: "image_url", image_url: { url: img } }));
      }
      if (msg.videoUrl) {
        parts.push({ type: "image_url", image_url: { url: msg.videoUrl } });
      }
      if (parts.length > 0) return { role: "user", content: parts };
    }
    return { role: msg.role, content: msg.content };
  });
}

export default function ChatArea({ chat, mode, features, onFeaturesChange, apiUrl, apiKey, activeModel, models, onMessagesUpdate, onModelAdd, onModelDelete, onActiveModelChange, onModeChange }) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [ratioMenuOpen, setRatioMenuOpen] = useState(false);
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const abortControllerRef = useRef(null);
  const bottomRef = useRef(null);
  const streamingRef = useRef("");
  const streamingStateRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const ratioContainerRef = useRef(null);
  const modelContainerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ratioContainerRef.current && !ratioContainerRef.current.contains(e.target)) setRatioMenuOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (modelContainerRef.current && !modelContainerRef.current.contains(e.target)) setModelOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { streamingStateRef.current = streaming; }, [streaming]);

  // Reset scroll lock when a new streaming turn starts
  useEffect(() => { if (streaming) userScrolledUpRef.current = false; }, [streaming]);

  // Track user scroll position in the message container
  const handleMessageScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || !streamingStateRef.current) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledUpRef.current = !atBottom;
  };

  // Auto-scroll: always when not streaming, only when at bottom during streaming
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat?.messages, streaming]);

  const timeStr = () => new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleSend = async (text, images = [], opts = {}) => {
    if (!activeModel || !apiUrl || !apiKey) return;

    // Gemini-only check for video mode
    if (features.video && opts.videoUrl) {
      const isGemini = activeModel.toLowerCase().includes("gemini");
      if (!isGemini) {
        setError("视频分析功能仅支持 Gemini 系列模型，请切换模型后再试。");
        return;
      }
    }

    setError("");
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      time: timeStr(),
      ...(images.length > 0 ? { images } : {}),
      ...(features.video && opts.videoUrl ? { videoUrl: opts.videoUrl } : {}),
    };
    const existing = chat?.messages || [];
    const updated = [...existing, userMsg];
    onMessagesUpdate(updated);

    const apiMessages = toApiMessages(updated);

    // Build extra request params from features
    const extraParams = {};
    if (features.structuredOutput) {
      extraParams.response_format = { type: "json_object" };
    }
    if (features.toolCalling) {
      extraParams.tools = [{ type: "function", function: { name: "analyze", description: "分析输入内容", parameters: { type: "object", properties: { result: { type: "string" } } } } }];
      extraParams.tool_choice = "auto";
    }

    if (mode === "image") {
      // Map ratio to image generation size (DALL-E compatible: 1024x1024 / 1792x1024 / 1024x1792)
      const ratioValue = ratio.value;
      let size = "1024x1024";
      const [rw, rh] = ratioValue.split("/").map(Number);
      if (rw > rh) size = "1792x1024";
      else if (rh > rw) size = "1024x1792";

      const prompt = text;

      setStreaming(true);
      const placeholderId = Date.now() + 1;
      onMessagesUpdate([...updated, { id: placeholderId, role: "assistant", content: "", time: timeStr(), ratio: ratio.value }]);
      try {
        const data = await imageGeneration({ apiUrl, apiKey, model: activeModel, prompt, images, size, n: 1, signal: controller.signal });
        const imageUrl = data.data?.[0]?.url || "";
        const revisedPrompt = data.data?.[0]?.revised_prompt || "";
        const resultContent = revisedPrompt || prompt;
        onMessagesUpdate([...updated, { id: placeholderId, role: "assistant", content: resultContent, images: imageUrl ? [imageUrl] : [], time: timeStr(), ratio: ratio.value }]);
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(e.message);
          onMessagesUpdate([...updated, { id: placeholderId, role: "assistant", content: `错误: ${e.message}`, time: timeStr(), ratio: ratio.value }]);
        }
      } finally { setStreaming(false); }
    } else {
      setStreaming(true);
      streamingRef.current = "";
      const assistantId = Date.now() + 1;
      onMessagesUpdate([...updated, { id: assistantId, role: "assistant", content: "", time: timeStr() }]);
      try {
        await chatCompletionStream({ apiUrl, apiKey, model: activeModel, messages: apiMessages, signal: controller.signal, ...extraParams,
          onChunk: (chunk) => { streamingRef.current += chunk; onMessagesUpdate([...updated, { id: assistantId, role: "assistant", content: streamingRef.current, time: timeStr() }]); },
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(e.message);
          onMessagesUpdate([...updated, { id: assistantId, role: "assistant", content: streamingRef.current || `错误: ${e.message}`, time: timeStr() }]);
        }
      } finally { setStreaming(false); }
    }
  };

  const handleAddModel = () => {
    const trimmedId = newModelId.trim();
    if (!trimmedId) return;
    onModelAdd({ id: trimmedId, name: newModelName.trim() || trimmedId });
    if (!activeModel) onActiveModelChange(trimmedId);
    setNewModelId(""); setNewModelName(""); setManagerOpen(false);
  };

  const noConfig = !apiUrl || !apiKey;
  const noModel = !activeModel;
  const activeModelObj = models.find((m) => m.id === activeModel);
  const isGemini = activeModel && activeModel.toLowerCase().includes("gemini");
  const videoNeedsGemini = features.video && !isGemini;

  return (
    <div className="flex flex-col h-full min-w-0 relative">
      <header className="h-14 flex items-center justify-between px-5 shrink-0 relative">
        <div className="absolute inset-0 glass-surface border-b border-[var(--border-subtle)]" />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="size-6 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            {mode === "image" ? <Image size={12} className="text-violet-400" /> : features.video ? <Video size={12} className="text-violet-400" /> : <MessageCircle size={12} className="text-violet-400" />}
          </div>
          <h2 className="text-sm font-semibold dark:text-zinc-200 text-zinc-800 truncate">{chat ? chat.title : "新对话"}</h2>
          {features.video && <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-medium">视频模式</span>}
          {mode === "image" && <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-medium">图像模式</span>}
        </div>
        <div className="relative z-10 flex items-center gap-2">
          {/* Gemini-only warning */}
          {videoNeedsGemini && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">需切换 Gemini 模型</span>
          )}
          {/* Ratio selector for image mode */}
          {mode === "image" && (
            <div className="relative" ref={ratioContainerRef}>
              <button onClick={() => setRatioMenuOpen(!ratioMenuOpen)}
                className="flex items-center gap-1.5 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border rounded-lg px-3 py-1.5 text-xs dark:text-zinc-300 text-zinc-700 transition-all duration-200 active:scale-95"
              ><span className="dark:text-zinc-500 text-zinc-600">比例</span><span className="font-medium text-violet-400">{ratio.label}</span></button>
              {ratioMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 dark:bg-zinc-800/95 bg-white/95 backdrop-blur-xl rounded-xl border-[var(--border-default)] border shadow-2xl overflow-hidden z-50">
                  {RATIOS.map((r) => (
                    <button key={r.label} onClick={() => { setRatio(r); setRatioMenuOpen(false); }}
                      className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${ratio.label === r.label ? "bg-violet-500/10 text-violet-400 border-l-2 border-l-violet-400" : "dark:text-zinc-400 text-zinc-500 dark:hover:bg-white/[0.04] hover:bg-zinc-100 dark:hover:text-zinc-200 hover:text-zinc-700 border-l-2 border-l-transparent"}`}
                    >{r.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Model selector */}
          <div className="relative" ref={modelContainerRef}>
            <button onClick={() => setModelOpen(!modelOpen)}
              className="flex items-center gap-1.5 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border rounded-lg text-xs dark:text-zinc-300 text-zinc-700 transition-all duration-200 active:scale-95 px-3 py-1.5 max-w-[180px]"
            >
              <Sparkles size={12} className="text-violet-400 shrink-0" />
              <span className="font-medium truncate">{activeModelObj ? activeModelObj.name : "选择模型"}</span>
              <ChevronDown size={11} className="dark:text-zinc-500 text-zinc-400 shrink-0 transition-transform duration-200 ml-0.5" style={{ transform: modelOpen ? "rotate(180deg)" : "" }} />
            </button>
            {modelOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 dark:bg-zinc-800/95 bg-white/95 backdrop-blur-xl rounded-xl border-[var(--border-default)] border shadow-2xl overflow-hidden z-50">
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
                        {m.id.toLowerCase().includes("gemini") && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">Gemini</span>}
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
        </div>
      </header>

      <div ref={scrollContainerRef} onScroll={handleMessageScroll} className="flex-1 overflow-y-auto custom-scrollbar relative">
        {(!chat || chat.messages.length === 0) && !streaming ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center select-none px-4 w-full max-w-2xl">
              <div className="size-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                {features.video ? <Video size={28} className="text-violet-400" strokeWidth={1.5} /> : mode === "image" ? <Image size={28} className="text-violet-400" strokeWidth={1.5} /> : <Sparkles size={28} className="text-violet-400" strokeWidth={1.5} />}
              </div>
              <h3 className="text-lg font-semibold dark:text-zinc-200 text-zinc-800 mb-2">
                {noConfig ? "请先配置 API" : noModel ? "请先添加模型" : features.video ? "AI 视频分析" : mode === "image" ? "AI 图像生成" : "开始对话"}
              </h3>
              <p className="text-sm dark:text-zinc-500 text-zinc-500 mb-6">
                {noConfig ? "点击左下角设置按钮，配置 API 地址和密钥" : noModel ? "点击顶部右侧模型选择器，添加模型" : features.video ? "上传视频文件，AI 将为你分析视频内容（仅支持 Gemini）" : mode === "image" ? "输入描述文字，AI 将为你生成图像" : "输入消息开始与 AI 对话"}
              </p>
              {!noConfig && !noModel && (
                <div className="flex justify-center mb-6">
                  <div className="inline-flex dark:bg-white/[0.04] bg-zinc-100 rounded-xl p-0.5 border-[var(--border-subtle)] border">
                    <button onClick={() => onModeChange("text")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "text" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 shadow-sm" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`}><MessageSquare size={16} />文本模式</button>
                    <button onClick={() => onModeChange("image")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "image" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 shadow-sm" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`}><Image size={16} />图像模式</button>
                  </div>
                </div>
              )}
              <ChatInput onSend={handleSend} activeModel={activeModel} features={features} onFeaturesChange={onFeaturesChange} mode={mode} variant="hero" streaming={streaming} onStop={handleStop} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 py-6">
            {error && <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400"><AlertTriangle size={16} />{error}</div>}
            <div className="space-y-10">
              {(chat?.messages || []).map((msg, i) => (
                <div key={msg.id} className="animate-message-in" style={{ animationDelay: `${Math.min(i, 5) * 0.05}s` }}>
                  <MessageBubble message={msg} isStreaming={mode === "image" && streaming && msg.role === "assistant" && !msg.content} />
                </div>
              ))}
            </div>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {((chat && chat.messages.length > 0) || streaming) && (
        <ChatInput
          onSend={handleSend}
          activeModel={activeModel}
          features={features}
          onFeaturesChange={onFeaturesChange}
          onStop={handleStop}
          mode={mode}
          variant="compact"
          streaming={streaming}
        />
      )}

      {/* Model Manager Modal */}
      {managerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setManagerOpen(false)} />
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
    </div>
  );
}

