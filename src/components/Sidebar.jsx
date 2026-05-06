import { useState, useRef } from "react";
import { Hexagon, PanelLeftClose, PanelLeftOpen, Plus, Clock, Settings, MessageSquare, Image, Trash2, Sun, Moon, Download, Upload } from "lucide-react";

const STORAGE_KEYS = [
  "xuannv_api_url",
  "xuannv_api_key",
  "xuannv_models",
  "xuannv_active_model",
  "xuannv_mode",
  "xuannv_chats",
  "xuannv_active_chat",
  "xuannv_theme",
];

export default function Sidebar({ collapsed, onToggle, mode, onModeChange, chats, activeChat, onChatSelect, onNewChat, onDeleteChat, theme, onThemeToggle, apiUrl, apiKey, onConfigSave }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [keyInput, setKeyInput] = useState(apiKey);
  const fileInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  return (
    <>
      <aside className={`flex flex-col h-full glass-surface border-r border-[var(--border-subtle)] shrink-0 transition-all duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] overflow-hidden relative ${collapsed ? "w-[70px]" : "w-[272px]"}`}>
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-violet-500/10 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 min-h-[56px]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0"><Hexagon size={28} className="text-violet-400 relative z-10" strokeWidth={1.5} fill="currentColor" fillOpacity={0.12} /><div className="absolute inset-0 blur-md bg-violet-500/30 rounded-full scale-75" /></div>
            {!collapsed && <span className="text-lg font-bold tracking-tight whitespace-nowrap text-gradient">玄女AI</span>}
          </div>
          <button onClick={onToggle} className="size-8 rounded-lg dark:hover:bg-white/[0.06] hover:bg-zinc-100 flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105 active:scale-95">
            {collapsed ? <PanelLeftOpen size={16} className="dark:text-zinc-500 text-zinc-600" /> : <PanelLeftClose size={16} className="dark:text-zinc-500 text-zinc-600" />}
          </button>
        </div>


        {/* New Chat */}
        <div className={`px-3 mb-3 ${collapsed ? "flex justify-center" : ""}`}>
          <button onClick={onNewChat} className={`flex items-center gap-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 rounded-xl transition-all duration-200 active:scale-[0.98] group ${collapsed ? "size-10 justify-center" : "w-full px-4 py-3"}`}>
            <Plus size={18} className="text-violet-400 shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            {!collapsed && <span className="text-sm dark:text-violet-400 text-violet-600 font-medium">新建对话</span>}
          </button>
        </div>

        {!collapsed && <div className="mx-4 mb-3 h-px bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent" />}

        {/* Chat History */}
        {!collapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 mb-2">
              <p className="text-xs font-semibold dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">历史对话</p>
              <div className="flex dark:bg-white/[0.05] bg-zinc-200/60 rounded-lg p-0.5 border-[var(--border-subtle)] border">
                <button onClick={() => onModeChange("text")} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${mode === "text" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`} title="文本模式"><MessageSquare size={11} className="inline mr-1" />文本</button>
                <button onClick={() => onModeChange("image")} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${mode === "image" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`} title="图像模式"><Image size={11} className="inline mr-1" />图像</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5">
              {chats.length === 0 ? (
                <p className="text-xs dark:text-zinc-600 text-zinc-500 text-center mt-8">暂无对话记录</p>
              ) : (chats.map((chat) => {
                const isActive = activeChat === chat.id;
                return (
                  <div key={chat.id} className="group/chat relative">
                    <button onClick={() => onChatSelect(chat.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${isActive ? "dark:bg-white/[0.06] bg-zinc-100 dark:text-zinc-200 text-zinc-700 border-[var(--border-subtle)] border" : "dark:text-zinc-400 text-zinc-500 dark:hover:bg-white/[0.03] hover:bg-zinc-50 dark:hover:text-zinc-300 hover:text-zinc-600 border border-transparent"}`}
                    ><Clock size={14} className="dark:text-zinc-500 text-zinc-500 shrink-0" /><span className="truncate flex-1">{chat.title}</span></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(chat); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 size-6 rounded-md flex items-center justify-center dark:text-zinc-400 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/chat:opacity-100 transition-all"><Trash2 size={12} /></button>
                  </div>
                );
              }))}
            </div>
          </div>
        )}

        {/* Theme + Config */}
        <div className={`mt-auto p-3 flex flex-col gap-1.5 ${collapsed ? "items-center" : ""}`}>
          <button onClick={onThemeToggle}
            className={`flex items-center gap-3 dark:bg-white/[0.03] bg-zinc-100 dark:hover:bg-white/[0.06] hover:bg-zinc-200 border-[var(--border-subtle)] border rounded-xl transition-all duration-200 active:scale-[0.98] ${collapsed ? "p-2" : "px-3 py-2.5 w-full"}`}
          >{theme === "dark" ? <Sun size={18} className="text-amber-400 shrink-0" /> : <Moon size={18} className="text-indigo-400 shrink-0" />}
            {!collapsed && <span className="text-sm dark:text-zinc-400 text-zinc-500">{theme === "dark" ? "浅色模式" : "深色模式"}</span>}
          </button>
          <button onClick={() => { setUrlInput(apiUrl); setKeyInput(apiKey); setConfigOpen(true); }}
            className={`flex items-center gap-3 dark:bg-white/[0.03] bg-zinc-100 dark:hover:bg-white/[0.06] hover:bg-zinc-200 border-[var(--border-subtle)] border rounded-xl transition-all duration-200 active:scale-[0.98] ${collapsed ? "p-2" : "px-3 py-2.5 w-full"}`}
          ><Settings size={18} className="dark:text-zinc-400 text-zinc-500 shrink-0" />{!collapsed && <span className="text-sm dark:text-zinc-400 text-zinc-500">配置</span>}</button>
        </div>
      </aside>

      {/* Config Modal */}
      {configOpen && (<>
        <div className="fixed inset-0 bg-black/60 dark:bg-black/60 bg-black/40 backdrop-blur-sm z-40" onClick={() => setConfigOpen(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] dark:bg-zinc-900/95 bg-white/95 backdrop-blur-xl rounded-2xl border-[var(--border-default)] border shadow-2xl animate-message-in overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]"><span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">API 配置</span></div>
          <div className="p-5 space-y-4">
            <div><label className="text-xs dark:text-zinc-500 text-zinc-500 mb-1.5 block">API 地址</label>
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://api.openai.com"
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors" /></div>
            <div><label className="text-xs dark:text-zinc-500 text-zinc-500 mb-1.5 block">API 密钥</label>
              <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="sk-..."
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors" /></div>
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
            <button onClick={() => setConfigOpen(false)} className="px-4 py-2 rounded-lg text-sm dark:text-zinc-400 text-zinc-500 dark:hover:text-zinc-200 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-100 transition-colors">取消</button>
            <button onClick={() => { onConfigSave(urlInput, keyInput); setConfigOpen(false); }} className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors">保存</button>
          </div>
        </div>
      </>)}

      {/* Delete Confirm Modal */}
      {deleteTarget && (<>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setDeleteTarget(null)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[380px] max-w-[90vw] dark:bg-zinc-900/95 bg-white/95 backdrop-blur-xl rounded-2xl border border-red-500/20 shadow-2xl shadow-red-500/5 animate-message-in overflow-hidden">
          <div className="flex flex-col items-center p-6 pt-5 text-center">
            <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-1">确认删除</h3>
            <p className="text-sm dark:text-zinc-400 text-zinc-500 mb-4">确定要删除这个对话吗？此操作无法撤销。</p>
            <div className="dark:bg-white/[0.04] bg-zinc-100 rounded-lg px-4 py-2.5 w-full">
              <p className="text-sm dark:text-zinc-300 text-zinc-700 truncate">{deleteTarget.title}</p>
            </div>
          </div>
          <div className="dark:bg-white/[0.02] bg-zinc-50 border-t border-[var(--border-subtle)] flex justify-end gap-2 px-5 py-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm dark:text-zinc-400 text-zinc-500 dark:hover:text-zinc-200 hover:text-zinc-700 dark:hover:bg-white/[0.04] hover:bg-zinc-100 transition-colors">取消</button>
            <button onClick={() => { onDeleteChat(deleteTarget.id); setDeleteTarget(null); }} className="px-5 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors">确认删除</button>
          </div>
        </div>
      </>)}
    </>
  );
}