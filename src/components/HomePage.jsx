import { useState, useRef, useEffect } from "react";
import { MessageSquare, Sparkles, ArrowRight, Hexagon, ChevronRight, Clock, Sun, Moon, Settings, Download, Upload, Eye, EyeOff, RefreshCw } from "lucide-react";
import { listModels, normalizeApiBaseUrl } from "../services/api";

const STORAGE_KEYS = [
  "xuannv_api_url", "xuannv_api_key", "xuannv_models",
  "xuannv_text_model", "xuannv_image_model",
  "xuannv_mode", "xuannv_text_features", "xuannv_image_features",
  "xuannv_chats", "xuannv_active_chat", "xuannv_theme",
  "xuannv_active_feature",
];

export default function HomePage({ onStartChat, theme, onThemeToggle, apiUrl, apiKey, onConfigSave, onModelsFetched }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [fetchingModels, setFetchingModels] = useState(false);
  const fetchControllerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");

  useEffect(() => () => fetchControllerRef.current?.abort(), []);

  const closeConfig = () => {
    fetchControllerRef.current?.abort();
    setFetchingModels(false);
    setShowKey(false);
    setConfigOpen(false);
  };

  const handleFetchModels = async () => {
    setConfigMsg("");
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    setFetchingModels(true);
    try {
      const normalizedUrl = normalizeApiBaseUrl(urlInput);
      if (!keyInput.trim()) throw new Error("请输入 API 密钥");
      const fetched = await listModels({ apiUrl: normalizedUrl, apiKey: keyInput.trim(), signal: controller.signal });
      onModelsFetched(fetched);
      setUrlInput(normalizedUrl);
      setConfigMsg(`成功拉取 ${fetched.length} 个模型，已合并到模型列表`);
    } catch (error) {
      if (error.name !== "AbortError") setConfigMsg(`拉取失败：${error.message}`);
    } finally {
      if (fetchControllerRef.current === controller) setFetchingModels(false);
    }
  };

  const handleConfigSave = () => {
    try {
      const normalizedUrl = normalizeApiBaseUrl(urlInput);
      if (!keyInput.trim()) throw new Error("请输入 API 密钥");
      onConfigSave(normalizedUrl, keyInput);
      closeConfig();
    } catch (error) {
      setConfigMsg(error.message);
    }
  };

  const handleExport = () => {
    const data = {};
    STORAGE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      data[key] = raw ? JSON.parse(raw) : null;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xuannv-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== "object" || data === null) throw new Error("无效的数据格式");
        let restored = 0;
        STORAGE_KEYS.forEach((key) => {
          if (key in data && data[key] !== undefined) {
            localStorage.setItem(key, JSON.stringify(data[key]));
            restored++;
          }
        });
        setImportMsg(`已恢复 ${restored} 项数据，即将刷新页面...`);
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportMsg(`导入失败：${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const cardBase =
    "group relative text-left p-5 sm:p-6 rounded-2xl transition-all duration-300 ease-out will-change-transform " +
    "border border-[var(--border-subtle)] glass-surface";

  const cardHoverActive =
    "hover:bg-violet-500/[0.08] hover:border-violet-500/25 hover:shadow-xl hover:shadow-violet-500/8 hover:-translate-y-1";

  const cardHoverUpcoming =
    "hover:bg-white/[0.04] hover:border-zinc-500/20 hover:shadow-xl hover:shadow-zinc-500/5 hover:-translate-y-1";

  return (
    <>
      <div className="relative z-10 flex items-center justify-center w-full h-full px-4 py-6 sm:py-8">
        <div className="w-full max-w-[960px] animate-message-in">
          {/* Top-right buttons: Settings + Theme */}
          <div className="flex justify-end gap-2 mb-2">
            <button
              onClick={() => { setUrlInput(apiUrl); setKeyInput(apiKey); setConfigMsg(""); setShowKey(false); setConfigOpen(true); }}
              className="size-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: "1px solid var(--border-subtle)" }}
              title="系统配置"
            >
              <Settings size={17} className="dark:text-zinc-400 text-zinc-500" />
            </button>
            <button
              onClick={onThemeToggle}
              className="size-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: "1px solid var(--border-subtle)" }}
              title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            >
              {theme === "dark" ? (
                <Sun size={17} className="text-amber-400" />
              ) : (
                <Moon size={17} className="text-indigo-400" />
              )}
            </button>
          </div>

          {/* Logo & Branding */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="relative shrink-0">
                <div className="absolute inset-0 blur-xl bg-violet-500/30 rounded-full scale-150" />
                <Hexagon
                  size={44}
                  className="sm:size-[48px] text-violet-400 relative z-10"
                  strokeWidth={1.2}
                  fill="currentColor"
                  fillOpacity={0.1}
                />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <Sparkles size={18} className="sm:size-[20px] text-violet-300" strokeWidth={1.5} />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient">
                玄女AI
              </h1>
            </div>
            <p className="text-xs sm:text-sm dark:text-zinc-500 text-zinc-600 max-w-xs sm:max-w-sm mx-auto leading-relaxed px-2">
              智能对话助手，支持文本对话与图像生成，为你的创意赋能
            </p>
          </div>

          {/* Feature Cards — 3 cards in responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5 px-1 sm:px-0">
            {/* Card 1 — 智能对话 */}
            <button
              onClick={onStartChat}
              onMouseEnter={() => setHoveredCard("chat")}
              onMouseLeave={() => setHoveredCard(null)}
              className={`${cardBase} ${hoveredCard === "chat" ? cardHoverActive + " -translate-y-1" : ""}`}
            >
              <div
                className="absolute inset-0 rounded-2xl bg-violet-500/5 blur-xl transition-opacity duration-300 pointer-events-none"
                style={{ opacity: hoveredCard === "chat" ? 1 : 0 }}
              />
              <div className="relative z-10 flex flex-col h-full">
                <div className="size-10 sm:size-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-300">
                  <MessageSquare size={20} className="sm:size-[22px] text-violet-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm sm:text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-1.5 sm:mb-2">智能对话</h3>
                <p className="text-xs sm:text-sm dark:text-zinc-500 text-zinc-600 leading-relaxed mb-4 sm:mb-5 flex-1">
                  支持文本对话、图像识别、视频分析等多模态交互，配备流式输出与模型管理
                </p>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                  <span>开始对话</span>
                  <ArrowRight size={14} className="sm:size-[15px] group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
              <div
                className="absolute bottom-0 left-3 right-3 sm:left-4 sm:right-4 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent transition-opacity duration-300"
                style={{ opacity: hoveredCard === "chat" ? 1 : 0 }}
              />
            </button>

            {/* Card 2 — 更多功能（即将推出） */}
            <button
              onMouseEnter={() => setHoveredCard("upcoming")}
              onMouseLeave={() => setHoveredCard(null)}
              className={`${cardBase} ${hoveredCard === "upcoming" ? cardHoverUpcoming + " -translate-y-1" : ""} opacity-80 hover:opacity-100`}
            >
              <div
                className="absolute inset-0 rounded-2xl bg-amber-500/3 blur-xl transition-opacity duration-300 pointer-events-none"
                style={{ opacity: hoveredCard === "upcoming" ? 1 : 0 }}
              />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="size-10 sm:size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Clock size={20} className="sm:size-[22px] text-amber-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 tracking-wider uppercase shrink-0">
                    即将推出
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-1.5 sm:mb-2">更多功能</h3>
                <p className="text-xs sm:text-sm dark:text-zinc-500 text-zinc-600 leading-relaxed mb-4 sm:mb-5 flex-1">
                  更多 AI 能力正在开发中，敬请期待更多创意工具与智能场景的上线
                </p>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium dark:text-zinc-600 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  <span>敬请期待</span>
                  <ChevronRight size={14} className="sm:size-[15px] group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
              <div
                className="absolute bottom-0 left-3 right-3 sm:left-4 sm:right-4 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent transition-opacity duration-300"
                style={{ opacity: hoveredCard === "upcoming" ? 1 : 0 }}
              />
            </button>
          </div>

          {/* Footer hint */}
          <p className="text-center mt-6 sm:mt-8 text-[10px] sm:text-xs dark:text-zinc-600 text-zinc-500">
            由先进的大语言模型驱动 · 安全可靠
          </p>
        </div>
      </div>

      {/* Config Modal */}
      {configOpen && (<>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeConfig} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] dark:bg-zinc-900/95 bg-white/95 backdrop-blur-xl rounded-2xl border-[var(--border-default)] border shadow-2xl animate-message-in overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]"><span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">API 配置</span></div>
          <div className="p-5 space-y-4">
            <div><label className="text-xs dark:text-zinc-500 text-zinc-500 mb-1.5 block">OpenAI 兼容 API 地址</label>
              <input type="text" value={urlInput} onChange={(e) => { setUrlInput(e.target.value); setConfigMsg(""); }} placeholder="https://api.openai.com 或 https://host/v1"
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors" /></div>
            <div><label className="text-xs dark:text-zinc-500 text-zinc-500 mb-1.5 block">API 密钥</label>
              <div className="relative">
                <input type={showKey ? "text" : "password"} value={keyInput} onChange={(e) => { setKeyInput(e.target.value); setConfigMsg(""); }} placeholder="sk-..."
                  className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg pl-3 pr-10 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors" />
                <button type="button" onClick={() => setShowKey((shown) => !shown)} title={showKey ? "隐藏密钥" : "显示密钥"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center dark:text-zinc-500 text-zinc-400 hover:text-violet-400">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] dark:text-zinc-600 text-zinc-500">配置仅保存在当前浏览器。模型列表通过 OpenAI 兼容的 GET /v1/models 获取。</p>
            <button type="button" onClick={handleFetchModels} disabled={fetchingModels || !urlInput.trim() || !keyInput.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2.5 text-sm text-violet-300 hover:bg-violet-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <RefreshCw size={15} className={fetchingModels ? "animate-spin" : ""} />
              {fetchingModels ? "正在拉取模型..." : "拉取模型"}
            </button>
            {configMsg && <p className={`text-xs ${configMsg.includes("成功") ? "text-emerald-400" : "text-red-400"}`}>{configMsg}</p>}
          </div>
          <div className="px-5 py-3 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] dark:text-zinc-500 text-zinc-500 mb-2 uppercase tracking-wider font-medium">数据管理</p>
            <div className="flex gap-2">
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs dark:text-zinc-300 text-zinc-600 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border transition-all duration-200"
              ><Download size={12} />导出备份</button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs dark:text-zinc-300 text-zinc-600 dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border transition-all duration-200"
              ><Upload size={12} />导入恢复</button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
            {importMsg && (
              <p className={`text-xs mt-2 ${importMsg.includes("失败") ? "text-red-400" : "text-emerald-400"}`}>{importMsg}</p>
            )}
          </div>
          <div className="px-5 py-3 dark:bg-white/[0.02] bg-zinc-50 border-t border-[var(--border-subtle)] flex justify-end gap-2">
            <button onClick={closeConfig} className="px-4 py-2 rounded-lg text-sm dark:text-zinc-400 text-zinc-500 dark:hover:text-zinc-200 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-100 transition-colors">取消</button>
            <button onClick={handleConfigSave} className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors">保存</button>
          </div>
        </div>
      </>)}
    </>
  );
}
