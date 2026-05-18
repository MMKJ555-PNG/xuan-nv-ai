import { ArrowLeft, Sun, Moon, Hexagon, Sparkles } from "lucide-react";
import Step1CoverCreate from "./CoverGenerator/Step1CoverCreate";
import Step2Gallery from "./CoverGenerator/Step2Gallery";

export default function CoverGenerator({ coverState, onCoverStateChange, apiUrl, apiKey, models, theme, onThemeToggle, onBackToHome }) {
  const update = (patch) => onCoverStateChange({ ...coverState, ...patch });
  const currentStep = coverState.currentStep || 1;

  return (
    <div className="relative z-10 flex flex-col w-full h-full">
      {/* Header bar */}
      <header className="h-14 flex items-center justify-between px-5 shrink-0 relative">
        <div className="absolute inset-0 glass-surface border-b border-[var(--border-subtle)]" />
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="size-8 rounded-lg dark:hover:bg-white/[0.06] hover:bg-zinc-100 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            title="返回首页"
          >
            <ArrowLeft size={16} className="dark:text-zinc-400 text-zinc-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <Hexagon size={22} className="text-violet-400" strokeWidth={1.5} fill="currentColor" fillOpacity={0.1} />
            </div>
            <span className="text-sm font-bold tracking-tight text-gradient">短视频封面生成</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {/* Step indicator */}
          <div className="flex dark:bg-white/[0.05] bg-zinc-100 rounded-xl p-0.5 border-[var(--border-subtle)] border">
            <button
              onClick={() => update({ currentStep: 1 })}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${currentStep === 1 ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 shadow-sm" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`}
            >
              第1步 · 封面生成
            </button>
            <button
              onClick={() => {
                const hasCovers = coverState.covers?.["3:4"]?.imageUrl || coverState.covers?.["16:9"]?.imageUrl;
                if (hasCovers) update({ currentStep: 2 });
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${currentStep === 2 ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 shadow-sm" : "dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700"}`}
            >
              第2步 · 作品库
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="size-8 rounded-lg dark:hover:bg-white/[0.06] hover:bg-zinc-100 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          >
            {theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* Step content */}
      {currentStep === 1 && (
        <Step1CoverCreate
          coverState={coverState}
          onCoverStateChange={onCoverStateChange}
          apiUrl={apiUrl}
          apiKey={apiKey}
          models={models}
          onNext={() => update({ currentStep: 2 })}
        />
      )}

      {currentStep === 2 && (
        <Step2Gallery
          coverState={coverState}
          onCoverStateChange={onCoverStateChange}
          onBack={() => update({ currentStep: 1 })}
        />
      )}
    </div>
  );
}
