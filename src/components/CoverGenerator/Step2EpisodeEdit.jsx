import { useState } from "react";
import { Sparkles, Download, ChevronLeft, RefreshCw, Edit3, Plus, Minus, AlertTriangle } from "lucide-react";
import CoverResultCard from "./CoverResultCard";
import { chatCompletion } from "../../services/api";

function downloadImage(imgEl, fallbackUrl, filename) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    canvas.toBlob((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "cover.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, "image/png");
  } catch {
    const a = document.createElement("a");
    a.href = fallbackUrl;
    a.download = filename || "cover.png";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function batchDownload(episodes, ratioKey, title) {
  episodes.forEach((ep, i) => {
    setTimeout(() => {
      const url = ep[ratioKey];
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}_${ep.text}_${ratioKey.replace(":", "x")}.png`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }, i * 300);
  });
}

export default function Step2EpisodeEdit({ coverState, onCoverStateChange, apiUrl, apiKey, imageModel, onBack }) {
  const [recognizing, setRecognizing] = useState(false);
  const [recogError, setRecogError] = useState("");
  const [generatingEpisodes, setGeneratingEpisodes] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });

  const { title, episodeNumber, requirements, covers, episodeText, episodeCount, episodes } = coverState;

  const update = (patch) => onCoverStateChange({ ...coverState, ...patch });

  const handleRecognizeText = async () => {
    if (!apiUrl || !apiKey) return;
    setRecognizing(true);
    setRecogError("");

    // Use a text/vision model to recognize episode text from one cover
    const coverUrl = covers["16:9"]?.imageUrl || covers["3:4"]?.imageUrl;
    if (!coverUrl) {
      setRecogError("没有可用的封面图");
      setRecognizing(false);
      return;
    }

    try {
      const data = await chatCompletion({
        apiUrl, apiKey, model: imageModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: coverUrl } },
              { type: "text", text: '请识别这张封面图上的集数文字（如"第1集"、"第2集"等）。只输出集数文字本身的格式模板，例如"第{N}集"。如果看不到集数文字，输出"无法识别"。只输出文字，不要加引号。' },
            ],
          },
        ],
      });
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      if (content && content !== "无法识别" && content.includes("集")) {
        update({ episodeText: content.replace(/\d+/g, "{N}") });
      } else {
        setRecogError(content === "无法识别" ? "未能识别到集数文字，请手动输入" : "识别结果不符合预期，请手动编辑");
        update({ episodeText: episodeText || "第{N}集" });
      }
    } catch (err) {
      setRecogError(err.message);
      update({ episodeText: episodeText || "第{N}集" });
    } finally {
      setRecognizing(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!apiUrl || !apiKey || !imageModel) return;
    setGeneratingEpisodes(true);
    setGenProgress({ current: 0, total: episodeCount });

    const newEpisodes = [];
    for (let n = 0; n < episodeCount; n++) {
      const epNum = episodeNumber + n;
      const epText = episodeText.replace("{N}", String(epNum));
      const ep = { episodeNum: epNum, text: epText, "3:4": null, "16:9": null };

      setGenProgress({ current: n + 1, total: episodeCount });

      try {
        const ratios = [
          { key: "3:4", value: "3/4", label: "竖版 (3:4)" },
          { key: "16:9", value: "16/9", label: "横版 (16:9)" },
        ];

        for (const r of ratios) {
          const systemPrompt = [
            "你是一个专业的短视频封面设计师。",
            `生成一张比例为 ${r.label}（${r.value}）的短视频封面图。`,
            `封面标题："${title}"，字体醒目，居中偏上。`,
            `集数："${epText}"，显示在封面右上角，字体清晰。`,
            `设计风格：${requirements || "现代简约、高级感"}`,
            "请直接输出封面图片URL。",
          ].join("\n");

          const userMessage = [];
          if (coverState.referenceImage) {
            userMessage.push({ type: "image_url", image_url: { url: coverState.referenceImage } });
          }
          userMessage.push({ type: "text", text: `请生成第${epNum}集的${r.label}封面图` });

          const data = await chatCompletion({
            apiUrl, apiKey, model: imageModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          });

          const content = data.choices?.[0]?.message?.content || "";
          const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
          const urlMatch = content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp))/i);
          ep[r.key] = mdMatch ? mdMatch[1] : urlMatch ? urlMatch[0] : content.trim();
          if (!ep[r.key].startsWith("http")) ep[r.key] = null;
        }
      } catch {
        // leave null for failed
      }

      newEpisodes.push(ep);
    }

    update({ episodes: newEpisodes });
    setGeneratingEpisodes(false);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Step 1 covers preview */}
        <div className="mb-6">
          <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4">Step 1 生成的封面</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
              <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold dark:text-zinc-400 text-zinc-600 uppercase tracking-wider">竖版 (3:4)</span>
              </div>
              <div style={{ aspectRatio: "3/4" }} className="bg-zinc-900/10">
                {covers["3:4"]?.imageUrl && (
                  <img src={covers["3:4"].imageUrl} alt="3:4" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
            <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
              <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold dark:text-zinc-400 text-zinc-600 uppercase tracking-wider">横版 (16:9)</span>
              </div>
              <div style={{ aspectRatio: "16/9" }} className="bg-zinc-900/10">
                {covers["16:9"]?.imageUrl && (
                  <img src={covers["16:9"].imageUrl} alt="16:9" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Episode text recognition */}
        <div className="glass-surface rounded-2xl p-5 sm:p-6 mb-6 border border-[var(--border-subtle)]">
          <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4 flex items-center gap-2">
            <Edit3 size={18} className="text-violet-400" />
            集数文字识别与编辑
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleRecognizeText}
              disabled={recognizing || !apiUrl || !apiKey}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-40"
            >
              <Sparkles size={14} className={recognizing ? "animate-spin" : ""} />
              {recognizing ? "AI 识别中..." : "AI 识别集数文字"}
            </button>
            {recogError && (
              <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={12} />{recogError}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">
              集数文字模板（用 &#123;N&#125; 代替集号）
            </label>
            <input
              type="text"
              value={episodeText}
              onChange={(e) => update({ episodeText: e.target.value })}
              placeholder='例如：第{N}集'
              className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors font-mono"
            />
            <p className="text-[10px] dark:text-zinc-600 text-zinc-400 mt-1">预览：第1集 → "{episodeText.replace("{N}", "1")}"</p>
          </div>

          {/* Episode count + batch generate */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs dark:text-zinc-500 text-zinc-600">生成集数：</span>
              <button
                onClick={() => update({ episodeCount: Math.max(1, episodeCount - 1) })}
                className="size-7 rounded-lg dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-subtle)] border flex items-center justify-center dark:text-zinc-400 text-zinc-600 hover:bg-zinc-200 transition-colors"
              ><Minus size={12} /></button>
              <span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800 w-8 text-center">{episodeCount}</span>
              <button
                onClick={() => update({ episodeCount: episodeCount + 1 })}
                className="size-7 rounded-lg dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-subtle)] border flex items-center justify-center dark:text-zinc-400 text-zinc-600 hover:bg-zinc-200 transition-colors"
              ><Plus size={12} /></button>
            </div>
            <button
              onClick={handleBatchGenerate}
              disabled={generatingEpisodes || !apiUrl || !apiKey || !imageModel || !episodeText}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed animate-pulse-glow"
            >
              <RefreshCw size={14} className={generatingEpisodes ? "animate-spin" : ""} />
              {generatingEpisodes ? `生成中 ${genProgress.current}/${genProgress.total}` : "批量生成所有集数"}
            </button>
          </div>
        </div>

        {/* Generated episodes grid */}
        {episodes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800">
                已生成集数 ({episodes.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => batchDownload(episodes, "3:4", title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95"
                >
                  <Download size={12} />下载全部 3:4
                </button>
                <button
                  onClick={() => batchDownload(episodes, "16:9", title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95"
                >
                  <Download size={12} />下载全部 16:9
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((ep) => (
                <div key={ep.episodeNum} className="glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
                  <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-xs font-semibold dark:text-zinc-300 text-zinc-700">{ep.text}</span>
                    <span className="text-[10px] dark:text-zinc-500 text-zinc-500">第{ep.episodeNum}集</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] dark:text-zinc-600 text-zinc-400 text-center mb-1">3:4</p>
                      <div style={{ aspectRatio: "3/4" }} className="rounded-lg overflow-hidden bg-zinc-900/10 border border-[var(--border-subtle)]">
                        {ep["3:4"] ? (
                          <img src={ep["3:4"]} alt={`${ep.text} 3:4`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-[9px] dark:text-zinc-600 text-zinc-400">无</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] dark:text-zinc-600 text-zinc-400 text-center mb-1">16:9</p>
                      <div style={{ aspectRatio: "16/9" }} className="rounded-lg overflow-hidden bg-zinc-900/10 border border-[var(--border-subtle)]">
                        {ep["16:9"] ? (
                          <img src={ep["16:9"]} alt={`${ep.text} 16:9`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-[9px] dark:text-zinc-600 text-zinc-400">无</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="flex justify-center pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border dark:text-zinc-400 text-zinc-600 transition-all duration-200 active:scale-95"
          >
            <ChevronLeft size={16} />
            返回上一步
          </button>
        </div>
      </div>
    </div>
  );
}
