import { useState } from "react";
import { MessageSquare, Sparkles, ArrowRight, Hexagon, ChevronRight, Clock, Sun, Moon } from "lucide-react";

export default function HomePage({ onStartChat, onStartImage, theme, onThemeToggle }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const cardBase =
    "group relative text-left p-5 sm:p-6 rounded-2xl transition-all duration-300 ease-out will-change-transform " +
    "border border-[var(--border-subtle)] glass-surface";

  const cardHoverChat =
    "hover:bg-violet-500/[0.08] hover:border-violet-500/25 hover:shadow-xl hover:shadow-violet-500/8 hover:-translate-y-1";

  const cardHoverUpcoming =
    "hover:bg-white/[0.04] hover:border-zinc-500/20 hover:shadow-xl hover:shadow-zinc-500/5 hover:-translate-y-1";

  return (
    <div className="relative z-10 flex items-center justify-center w-full h-full px-4 py-6 sm:py-8">
      <div className="w-full max-w-[680px] animate-message-in">
        {/* Theme toggle — top-right corner */}
        <div className="flex justify-end mb-2">
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

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 px-1 sm:px-0">
          {/* Card 1 — 智能对话 */}
          <button
            onClick={onStartChat}
            onMouseEnter={() => setHoveredCard("chat")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`${cardBase} ${hoveredCard === "chat" ? cardHoverChat + " -translate-y-1" : ""}`}
          >
            {/* Hover glow overlay */}
            <div
              className="absolute inset-0 rounded-2xl bg-violet-500/5 blur-xl transition-opacity duration-300 pointer-events-none"
              style={{ opacity: hoveredCard === "chat" ? 1 : 0 }}
            />

            <div className="relative z-10 flex flex-col h-full">
              <div className="size-10 sm:size-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-300">
                <MessageSquare size={20} className="sm:size-[22px] text-violet-400" strokeWidth={1.5} />
              </div>

              <h3 className="text-sm sm:text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-1.5 sm:mb-2">
                智能对话
              </h3>

              <p className="text-xs sm:text-sm dark:text-zinc-500 text-zinc-600 leading-relaxed mb-4 sm:mb-5 flex-1">
                支持文本对话、图像识别、视频分析等多模态交互，配备流式输出与模型管理
              </p>

              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                <span>开始对话</span>
                <ArrowRight size={14} className="sm:size-[15px] group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>

            {/* Bottom glow bar */}
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
            {/* Hover glow overlay */}
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

              <h3 className="text-sm sm:text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-1.5 sm:mb-2">
                更多功能
              </h3>

              <p className="text-xs sm:text-sm dark:text-zinc-500 text-zinc-600 leading-relaxed mb-4 sm:mb-5 flex-1">
                更多 AI 能力正在开发中，敬请期待更多创意工具与智能场景的上线
              </p>

              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium dark:text-zinc-600 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                <span>敬请期待</span>
                <ChevronRight size={14} className="sm:size-[15px] group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>

            {/* Bottom glow bar */}
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
  );
}
