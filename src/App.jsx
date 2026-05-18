import { useState, useCallback, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import HomePage from "./components/HomePage";
import useLocalStorage from "./hooks/useLocalStorage";
import { chatCompletion } from "./services/api";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useLocalStorage("xuannv_theme", "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Persisted state
  const [apiUrl, setApiUrl] = useLocalStorage("xuannv_api_url", "");
  const [apiKey, setApiKey] = useLocalStorage("xuannv_api_key", "");
  const [models, setModels] = useLocalStorage("xuannv_models", []);
  const [activeModel, setActiveModel] = useLocalStorage("xuannv_active_model", "");
  const [mode, setMode] = useLocalStorage("xuannv_mode", "text");
  const [features, setFeatures] = useLocalStorage("xuannv_features", { video: false, structuredOutput: false, toolCalling: false, thinking: false });
  const [chats, setChats] = useLocalStorage("xuannv_chats", []);
  const [activeChat, setActiveChat] = useLocalStorage("xuannv_active_chat", null);

  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const titleGenRef = useRef(new Set());

  const generateTitle = useCallback(async (chatId, userContent) => {
    if (!apiUrl || !apiKey || !activeModel) return;
    if (titleGenRef.current.has(chatId)) return;
    titleGenRef.current.add(chatId);
    try {
      const data = await chatCompletion({
        apiUrl, apiKey, model: activeModel,
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
      // 失败时用首条消息截取作为兜底标题
      const fallback = userContent.replace(/\s/g, "").slice(0, 10);
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title: fallback || "新对话" } : c));
    }
  }, [apiUrl, apiKey, activeModel, setChats]);

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
  }, [mode, setChats, setActiveChat]);

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

      {/* Content: HomePage when no active chat, otherwise sidebar+chat layout */}
      {!activeChat ? (
        <div className="relative z-10 flex w-full h-full">
          <HomePage
            onStartChat={() => handleNewChat("text")}
            onStartImage={() => handleNewChat("image")}
          />
        </div>
      ) : (
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
            onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
            apiUrl={apiUrl}
            apiKey={apiKey}
            onConfigSave={(url, key) => {
              setApiUrl(url);
              setApiKey(key);
            }}
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
              onModelAdd={(m) => {
                setModels((prev) => [...prev, m]);
                if (!activeModel) setActiveModel(m.id);
              }}
              onModelDelete={(modelId) => {
                setModels((prev) => prev.filter((m) => m.id !== modelId));
                if (activeModel === modelId) {
                  const rest = models.filter((m) => m.id !== modelId);
                  setActiveModel(rest.length > 0 ? rest[0].id : "");
                }
              }}
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
