import { useState, useCallback, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import HomePage from "./components/HomePage";
import useLocalStorage from "./hooks/useLocalStorage";
import { chatCompletion, normalizeApiBaseUrl } from "./services/api";

const DEFAULT_TEXT_FEATURES = { structuredOutput: false, toolCalling: false, thinking: false };
const DEFAULT_IMAGE_FEATURES = {};

function normalizeChats(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((chat) => chat && typeof chat === "object" && chat.id != null).map((chat) => ({
    ...chat,
    title: typeof chat.title === "string" && chat.title ? chat.title : "新对话",
    mode: chat.mode === "image" ? "image" : "text",
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    createdAt: Number.isFinite(chat.createdAt) ? chat.createdAt : (Number.isFinite(chat.id) ? chat.id : 0),
  }));
}

function omitLocalMedia(chats) {
  const sanitize = (value, state) => {
    if (typeof value === "string") return value.startsWith("data:") ? (state.omitted = true, "") : value;
    if (Array.isArray(value)) return value.map((item) => sanitize(item, state)).filter((item) => item !== "");
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item, state)]));
  };
  return chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map((message) => {
      const state = { omitted: false };
      const next = sanitize(message, state);
      return state.omitted ? { ...next, mediaPersistence: "omitted" } : next;
    }),
  }));
}

function createChatId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeModels(existing, incoming) {
  const merged = existing.filter((model) => model && typeof model.id === "string").map((model) => ({ ...model, id: model.id.trim() }));
  const byId = new Map(merged.map((model) => [model.id, model]));
  for (const model of incoming) {
    const current = byId.get(model.id);
    if (current) {
      Object.assign(current, {
        ownedBy: current.ownedBy || model.ownedBy,
        source: current.source || model.source,
      });
    } else {
      merged.push(model);
      byId.set(model.id, model);
    }
  }
  return merged;
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useLocalStorage("xuannv_theme", "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Persisted state — API config
  const [apiUrl, setApiUrl] = useLocalStorage("xuannv_api_url", "");
  const [apiKey, setApiKey] = useLocalStorage("xuannv_api_key", "");

  // Mode — "text" or "image"
  const [mode, setMode] = useLocalStorage("xuannv_mode", "text");

  // Models — shared pool, but each mode has its own active selection
  const [models, setModels] = useLocalStorage("xuannv_models", []);
  const [textModel, setTextModel] = useLocalStorage("xuannv_text_model", "");
  const [imageModel, setImageModel] = useLocalStorage("xuannv_image_model", "");

  // Features — completely separate per mode
  const [textFeatures, setTextFeatures] = useLocalStorage("xuannv_text_features", DEFAULT_TEXT_FEATURES);
  const [imageFeatures, setImageFeatures] = useLocalStorage("xuannv_image_features", DEFAULT_IMAGE_FEATURES);

  const [chats, setChats, chatsPersistence] = useLocalStorage("xuannv_chats", [], {
    normalize: normalizeChats,
    onQuotaExceeded: omitLocalMedia,
  });
  const [activeChat, setActiveChat] = useLocalStorage("xuannv_active_chat", null);

  // Feature routing: "home" | "chat"
  const [activeFeature, setActiveFeature] = useLocalStorage("xuannv_active_feature", "home");

  // Per-mode derived values
  const activeModel = mode === "image" ? imageModel : textModel;
  const features = mode === "image" ? imageFeatures : textFeatures;

  const setActiveModel = mode === "image" ? setImageModel : setTextModel;
  const setFeatures = mode === "image" ? setImageFeatures : setTextFeatures;

  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const titleGenRef = useRef(new Set());

  useEffect(() => {
    if (activeChat != null && !chats.some((chat) => chat.id === activeChat)) {
      setActiveChat(chats[0]?.id ?? null);
    }
  }, [activeChat, chats, setActiveChat]);

  const generateTitle = useCallback(async (chatId, userContent) => {
    const model = textModel || imageModel;
    if (!apiUrl || !apiKey || !model) return;
    if (titleGenRef.current.has(chatId)) return;
    titleGenRef.current.add(chatId);
    try {
      const data = await chatCompletion({
        apiUrl, apiKey, model,
        messages: [
          { role: "system", content: "你是标题生成助手。根据用户问题生成4-6字中文标题，概括对话主题。严格只输出标题本身，不加引号、标点、换行或任何额外文字。" },
          { role: "user", content: userContent.slice(0, 300) },
        ],
      });
      const title = data.choices?.[0]?.message?.content?.trim()?.slice(0, 10) || "";
      if (title) {
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title } : c));
      }
    } catch {
      titleGenRef.current.delete(chatId);
      const fallback = userContent.replace(/\s/g, "").slice(0, 10);
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title: fallback || "新对话" } : c));
    }
  }, [apiUrl, apiKey, textModel, imageModel, setChats]);

  const currentChat = chats.find((c) => c.id === activeChat) || null;

  const handleNewChat = useCallback((chatMode) => {
    const targetMode = chatMode || mode;
    const newChat = {
      id: createChatId(),
      title: "新对话",
      mode: targetMode,
      messages: [],
      createdAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newChat.id);
    setActiveFeature("chat");
    if (targetMode !== mode) setMode(targetMode);
  }, [mode, setChats, setActiveChat, setActiveFeature, setMode]);

  const handleDeleteChat = useCallback(
    (chatId) => {
      setChats((prev) => {
        const remaining = prev.filter((c) => c.id !== chatId);
        if (activeChatRef.current === chatId) setActiveChat(remaining[0]?.id ?? null);
        return remaining;
      });
      titleGenRef.current.delete(chatId);
    },
    [setChats, setActiveChat]
  );

  const handleUpdateMessages = useCallback(
    (messages) => {
      const chatId = activeChatRef.current;
      if (!chatId) {
        const newId = createChatId();
        const newChat = {
          id: newId,
          title: "生成标题中…",
          mode,
          messages,
          createdAt: Date.now(),
        };
        setChats((prev) => [newChat, ...prev]);
        setActiveChat(newId);
        activeChatRef.current = newId;
        if (messages.length > 0 && messages[0].role === "user") {
          generateTitle(newId, messages[0].content);
        }
        return;
      }
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          if (messages.length > 0 && messages[0].role === "user" && c.title === "新对话") {
            generateTitle(chatId, messages[0].content);
          }
          return { ...c, messages };
        })
      );
    },
    [mode, setChats, setActiveChat, generateTitle]
  );

  const handleModelAdd = useCallback(
    (m) => {
      setModels((prev) => [...prev, m]);
      if (mode === "image" && !imageModel) setImageModel(m.id);
      if (mode === "text" && !textModel) setTextModel(m.id);
    },
    [mode, imageModel, textModel, setModels, setImageModel, setTextModel]
  );

  const handleModelDelete = useCallback(
    (modelId) => {
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      if (textModel === modelId) setTextModel("");
      if (imageModel === modelId) setImageModel("");
    },
    [textModel, imageModel, setModels, setTextModel, setImageModel]
  );

  const handleModelsFetched = useCallback((incomingModels) => {
    setModels((prev) => mergeModels(prev, incomingModels));
  }, [setModels]);

  const handleConfigSave = useCallback((url, key) => {
    setApiUrl(normalizeApiBaseUrl(url));
    setApiKey(key.trim());
  }, [setApiUrl, setApiKey]);

  const handleGoHome = useCallback(() => {
    setActiveFeature("home");
    setActiveChat(null);
  }, [setActiveFeature, setActiveChat]);

  const themeToggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <div className="flex h-screen text-white antialiased relative">
      {chatsPersistence.status === "warning" && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] max-w-[90vw] rounded-lg border border-amber-500/30 bg-amber-950/95 px-4 py-2 text-xs text-amber-100 shadow-xl">
          浏览器空间不足，文本历史已保存，本地图片或视频未保存。
        </div>
      )}
      {chatsPersistence.status === "error" && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] max-w-[90vw] rounded-lg border border-red-500/30 bg-red-950/95 px-4 py-2 text-xs text-red-100 shadow-xl">
          对话历史未能保存，刷新或关闭页面后可能丢失。请先导出备份或清理浏览器存储空间。
        </div>
      )}
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, rgba(99,102,241,0.05) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[450px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(79,70,229,0.08) 0%, rgba(129,140,248,0.04) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div className="absolute top-[30%] left-[-5%] w-[500px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.05) 0%, rgba(34,211,238,0.02) 50%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        <div className="absolute bottom-[-15%] left-1/3 w-[450px] h-[350px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, rgba(192,132,252,0.03) 50%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
      </div>

      {/* Noise grain + dot pattern */}
      <div className="bg-noise" />
      <div className="fixed inset-0 bg-dot-pattern pointer-events-none z-[2]" />

      {/* Content routing */}
      {activeFeature === "home" && (
        <HomePage
          onStartChat={() => handleNewChat("text")}
          onStartImage={() => handleNewChat("image")}
          theme={theme}
          onThemeToggle={themeToggle}
          apiUrl={apiUrl}
          apiKey={apiKey}
          onConfigSave={handleConfigSave}
          onModelsFetched={handleModelsFetched}
        />
      )}

      {activeFeature === "chat" && (
        <div className="relative z-10 flex w-full h-full">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            mode={mode}
            onModeChange={setMode}
            chats={chats}
            activeChat={activeChat}
            onChatSelect={setActiveChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            theme={theme}
            onThemeToggle={themeToggle}
            onGoHome={handleGoHome}
          />

          <main className="flex-1 flex flex-col min-w-0 relative">
            <ChatArea
              chat={currentChat}
              mode={mode}
              features={features}
              onFeaturesChange={setFeatures}
              apiUrl={apiUrl}
              apiKey={apiKey}
              models={models}
              activeModel={activeModel}
              onMessagesUpdate={handleUpdateMessages}
              onModelAdd={handleModelAdd}
              onModelDelete={handleModelDelete}
              onActiveModelChange={setActiveModel}
              onNewChat={handleNewChat}
              onModeChange={setMode}
            />
          </main>
        </div>
      )}

    </div>
  );
}

export default App;
