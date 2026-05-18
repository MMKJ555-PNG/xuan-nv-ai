import { useState } from "react";
import { MessageSquare, Sparkles, ArrowRight, Hexagon, ChevronRight, Clock } from "lucide-react";

export default function HomePage({ onStartChat, onStartImage }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div className="flex items-center justify-center h-full px-4 py-8">
      <div className="w-full max-w-[720px] animate-message-in">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 blur-xl bg-violet-500/30 rounded-full scale-150" />
              <Hexagon
                size={48}
                className="text-violet-400 relative z-10"
                strokeWidth={1.2}
                fill="currentColor"
                fillOpacity={0.1}
              />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <Sparkles size={20} className="text-violet-300" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">玄女AI</h1>
          </div>
          <p className="text-sm dark:text-zinc-500 text-zinc-600 max-w-sm mx-auto leading-relaxed">
            智能对话助手，支持文本对话与图像生成，为你的创意赋能
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Card 1 — Chat */}
          <button
            onClick={onStartChat}
            onMouseEnter={() => setHoveredCard("chat")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group relative text-left p-6 rounded-2xl transition-all duration-300
              border border-[var(--border-subtle)]
              ${hoveredCard === "chat"
                ? "bg-violet-500/[0.08] border-violet-500/25 shadow-lg shadow-violet-500/5 -translate-y-1"
                : "glass-surface"
              }`}
          >
            {/* Glow on hover */}
            <div className={`absolute inset-0 rounded-2xl bg-violet-500/5 blur-xl transition-opacity duration-300 pointer-events-none ${hoveredCard === "chat" ? "opacity-100" : "opacity-0"}`} />

            <div className="relative z-10">
              <div className="size-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <MessageSquare size={22} className="text-violet-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-2">
                智能对话
              </h3>
              <p className="text-sm dark:text-zinc-500 text-zinc-600 leading-relaxed mb-5">
                支持文本对话、图像识别、视频分析等多模态交互，配备流式输出与模型管理
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                <span>开始对话</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>

            {/* Bottom indicator bar */}
            <div className={`absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent transition-opacity duration-300 ${hoveredCard === "chat" ? "opacity-100" : "opacity-0"}`} />
          </button>

          {/* Card 2 — Upcoming */}
          <button
            onMouseEnter={() => setHoveredCard("upcoming")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group relative text-left p-6 rounded-2xl transition-all duration-300
              border border-[var(--border-subtle)]
              ${hoveredCard === "upcoming"
                ? "bg-white/[0.04] border-zinc-500/20 shadow-lg shadow-zinc-500/5 -translate-y-1"
                : "glass-surface opacity-75"
              }`}
          >
            {/* Glow on hover */}
            <div className={`absolute inset-0 rounded-2xl bg-amber-500/3 blur-xl transition-opacity duration-300 pointer-events-none ${hoveredCard === "upcoming" ? "opacity-100" : "opacity-0"}`} />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Clock size={22} className="text-amber-400" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 tracking-wider uppercase">
                  即将推出
                </span>
              </div>
              <h3 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-2">
                更多功能
              </h3>
              <p className="text-sm dark:text-zinc-500 text-zinc-600 leading-relaxed mb-5">
                更多 AI 能力正在开发中，敬请期待更多创意工具与智能场景的上线
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium dark:text-zinc-600 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                <span>敬请期待</span>
                <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>

            {/* Bottom indicator bar */}
            <div className={`absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent transition-opacity duration-300 ${hoveredCard === "upcoming" ? "opacity-100" : "opacity-0"}`} />
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center mt-8 text-xs dark:text-zinc-600 text-zinc-500">
          由先进的大语言模型驱动 · 安全可靠
        </p>
      </div>
    </div>
  );
}
