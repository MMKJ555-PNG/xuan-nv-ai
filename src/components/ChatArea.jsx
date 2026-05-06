import { useState, useRef, useEffect } from "react";
import { MessageCircle, AlertTriangle, Image, Sparkles, MessageSquare } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { chatCompletionStream, chatCompletion } from "../services/api";

const RATIOS = [
  { label: "1:1", value: "1/1" },
  { label: "4:3", value: "4/3" },
  { label: "3:2", value: "3/2" },
  { label: "16:9", value: "16/9" },
  { label: "9:16", value: "9/16" },
  { label: "2:3", value: "2/3" },
];

function toApiMessages(messages) {
  return messages.map((msg) => {
    if (msg.role === "user" && msg.images?.length > 0) {
      const parts = [{ type: "text", text: msg.content }];
      msg.images.forEach((img) => parts.push({ type: "image_url", image_url: { url: img } }));
      return { role: "user", content: parts };
    }
    return { role: msg.role, content: msg.content };
  });
}

export default function ChatArea({ chat, mode, onModeChange, apiUrl, apiKey, activeModel, models, onMessagesUpdate, onModelAdd, onModelDelete, onActiveModelChange, onNewChat }) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [ratioMenuOpen, setRatioMenuOpen] = useState(false);
  const [ratio, setRatio] = useState(RATIOS[0]);
  const bottomRef = useRef(null);
  const streamingRef = useRef("");
  const streamingStateRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const ratioContainerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ratioContainerRef.current && !ratioContainerRef.current.contains(e.target)) setRatioMenuOpen(false); };
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

  const handleSend = async (text, images = []) => {
    if (!activeModel || !apiUrl || !apiKey) return;
    setError("");
    const userMsg = { id: Date.now(), role: "user", content: text, time: timeStr(), ...(images.length > 0 ? { images } : {}) };
    const existing = chat?.messages || [];
    const updated = [...existing, userMsg];
    onMessagesUpdate(updated);

    const apiMessages = toApiMessages(updated);

    if (mode === "image") {
      // Inject ratio instruction into the prompt
      const ratioPrompt = `\n[系统指令：请生成宽高比为 ${ratio.label}（${ratio.value}）的图像]`;
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (typeof lastMsg.content === "string") {
        lastMsg.content += ratioPrompt;
      } else {
        lastMsg.content[0].text += ratioPrompt;
      }

      setStreaming(true);
      const placeholderId = Date.now() + 1;
      onMessagesUpdate([...updated, { id: placeholderId, role: "assistant", content: "", time: timeStr(), ratio: ratio.value }]);
      try {
        const data = await chatCompletion({ apiUrl, apiKey, model: activeModel, messages: apiMessages });
        const content = data.choices?.[0]?.message?.content || "";
        onMessagesUpdate([...updated, { id: placeholderId, role: "assistant", content, time: timeStr(), ratio: ratio.value }]);
      } catch (e) {
        setError(e.message);
        onMessagesUpdate([...updated, { id: placeholderId, role: "assistant", content: `错误: ${e.message}`, time: timeStr(), ratio: ratio.value }]);
      } finally { setStreaming(false); }
    } else {
      setStreaming(true);
      streamingRef.current = "";
      const assistantId = Date.now() + 1;
      onMessagesUpdate([...updated, { id: assistantId, role: "assistant", content: "", time: timeStr() }]);
      try {
        await chatCompletionStream({ apiUrl, apiKey, model: activeModel, messages: apiMessages,
          onChunk: (chunk) => { streamingRef.current += chunk; onMessagesUpdate([...updated, { id: assistantId, role: "assistant", content: streamingRef.current, time: timeStr() }]); },
        });
      } catch (e) {
        setError(e.message);
        onMessagesUpdate([...updated, { id: assistantId, role: "assistant", content: streamingRef.current || `错误: ${e.message}`, time: timeStr() }]);
      } finally { setStreaming(false); }
    }
  };

  const noConfig = !apiUrl || !apiKey;
  const noModel = !activeModel;

  return (
    <div className="flex flex-col h-full min-w-0 relative">
      <header className="h-14 flex items-center justify-between px-5 shrink-0 relative">
        <div className="absolute inset-0 glass-surface border-b border-[var(--border-subtle)]" />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="size-6 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            {mode === "image" ? <Image size={12} className="text-violet-400" /> : <MessageCircle size={12} className="text-violet-400" />}
          </div>
          <h2 className="text-sm font-semibold dark:text-zinc-200 text-zinc-800 truncate">{chat ? chat.title : "新对话"}</h2>
          {mode === "image" && <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-medium">图像模式</span>}
        </div>
        {mode === "image" && (
          <div className="relative z-10" ref={ratioContainerRef}>
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
      </header>

      <div ref={scrollContainerRef} onScroll={handleMessageScroll} className="flex-1 overflow-y-auto custom-scrollbar relative">
        {(!chat || chat.messages.length === 0) && !streaming ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center select-none px-4 w-full max-w-2xl">
              <div className="size-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                {mode === "image" ? <Image size={28} className="text-violet-400" strokeWidth={1.5} /> : <Sparkles size={28} className="text-violet-400" strokeWidth={1.5} />}
              </div>
              <h3 className="text-lg font-semibold dark:text-zinc-200 text-zinc-800 mb-2">
                {noConfig ? "请先配置 API" : noModel ? "请先添加模型" : mode === "image" ? "AI 图像生成" : "开始对话"}
              </h3>
              <p className="text-sm dark:text-zinc-500 text-zinc-500 mb-6">
                {noConfig ? "点击左下角设置按钮，配置 API 地址和密钥" : noModel ? "点击输入框左侧模型选择器，添加模型" : mode === "image" ? "输入描述文字，AI 将为你生成图像" : "输入消息开始与 AI 对话"}
              </p>
              {!noConfig && !noModel && (
                <div className="flex justify-center mb-6">
                  <div className="inline-flex dark:bg-white/[0.04] bg-zinc-100 rounded-xl p-0.5 border-[var(--border-subtle)] border">
                    <button onClick={() => onModeChange("text")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "text" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 shadow-sm" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`}><MessageSquare size={16} />文本模式</button>
                    <button onClick={() => onModeChange("image")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "image" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 shadow-sm" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`}><Image size={16} />图像模式</button>
                  </div>
                </div>
              )}
              <ChatInput onSend={handleSend} models={models} activeModel={activeModel} onActiveModelChange={onActiveModelChange} onModelAdd={onModelAdd} onModelDelete={onModelDelete} variant="hero" />
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
          models={models}
          activeModel={activeModel}
          onActiveModelChange={onActiveModelChange}
          onModelAdd={onModelAdd}
          onModelDelete={onModelDelete}
          variant="compact"
        />
      )}
    </div>
  );
}
