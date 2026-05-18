import { useState, useCallback, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import HomePage from "./components/HomePage";
import CoverGenerator from "./components/CoverGenerator";
import useLocalStorage from "./hooks/useLocalStorage";
import { chatCompletion } from "./services/api";

const DEFAULT_TEXT_FEATURES = { structuredOutput: false, toolCalling: false, thinking: false };
const DEFAULT_IMAGE_FEATURES = {};

const INITIAL_COVER_STATE = {
  referenceImage: null,
  title: "",
  episodeNumber: 1,
  requirements: "",
  covers: {
    "3:4": { imageUrl: null, prompt: "", isGenerating: false },
    "16:9": { imageUrl: null, prompt: "", isGenerating: false },
  },
  episodeText: "",
  episodeCount: 1,
  episodes: [],
  currentStep: 1,
};

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

  const [chats, setChats] = useLocalStorage("xuannv_chats", []);
  const [activeChat, setActiveChat] = useLocalStorage("xuannv_active_chat", null);

  // Feature routing: "home" | "chat" | "cover"
  const [activeFeature, setActiveFeature] = useLocalStorage("xuannv_active_feature", "home");
  const [coverState, setCoverState] = useLocalStorage("xuannv_cover_state", INITIAL_COVER_STATE);

  // Per-mode derived values
  const activeModel = mode === "image" ? imageModel : textModel;
  const features = mode === "image" ? imageFeatures : textFeatures;

  const setActiveModel = mode === "image" ? setImageModel : setTextModel;
  const setFeatures = mode === "image" ? setImageFeatures : setTextFeatures;

  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const titleGenRef = useRef(new Set());

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
      id: Date.now(),
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
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      titleGenRef.current.delete(chatId);
      if (activeChat === chatId) {
        const remaining = chats.filter((c) => c.id !== chatId);
        setActiveChat(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    [activeChat, chats, setChats, setActiveChat]
  );

  const handleUpdateMessages = useCallback(
    (messages) => {
      const chatId = activeChatRef.current;
      if (!chatId) {
        const newId = Date.now();
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

  const handleGoHome = useCallback(() => {
    setActiveFeature("home");
    setActiveChat(null);
  }, [setActiveFeature, setActiveChat]);

  const themeToggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <div className="flex h-screen text-white antialiased relative">
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
          onStartCover={() => setActiveFeature("cover")}
          theme={theme}
          onThemeToggle={themeToggle}
          apiUrl={apiUrl}
          apiKey={apiKey}
          onConfigSave={(url, key) => { setApiUrl(url); setApiKey(key); }}
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

      {activeFeature === "cover" && (
        <CoverGenerator
          coverState={coverState}
          onCoverStateChange={setCoverState}
          apiUrl={apiUrl}
          apiKey={apiKey}
          imageModel={imageModel}
          textModel={textModel}
          models={models}
          theme={theme}
          onThemeToggle={themeToggle}
          onBackToHome={handleGoHome}
        />
      )}
    </div>
  );
}

export default App;
