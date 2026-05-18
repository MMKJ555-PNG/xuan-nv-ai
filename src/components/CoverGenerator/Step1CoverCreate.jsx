import { useState, useRef } from "react";
import { Upload, X, Sparkles, AlertTriangle, Info } from "lucide-react";
import CoverResultCard from "./CoverResultCard";
import { chatCompletion } from "../../services/api";

function buildRatioPrompt(title, episodeNumber, ratio, ratioLabel, requirements, referenceImage) {
  const lines = [
    `你是一个专业的短视频封面设计师。请根据以下信息生成一张比例为 ${ratioLabel}（${ratio}）的短视频封面图。`,
    ``,
    `【必须包含的元素】`,
    `1. 封面标题必须包含文字："${title}"，字体醒目大气，位置居中偏上`,
    `2. 第${episodeNumber}集的集数信息显示在封面右上角，格式为"第${episodeNumber}集"，字体清晰`,
    `3. 整体设计风格：${requirements || "现代简约、高级感、适合短视频平台展示"}`,
    ``,
    `【输出要求】`,
    `- 请直接输出封面图片的URL`,
    `- 图片应为高质量、可直接使用的封面图`,
  ];
  return lines.join("\n");
}

export default function Step1CoverCreate({ coverState, onCoverStateChange, apiUrl, apiKey, imageModel, onNext, title: filenameTitle }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const { referenceImage, title, episodeNumber, requirements, covers } = coverState;

  const update = (patch) => onCoverStateChange({ ...coverState, ...patch });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ referenceImage: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    update({ referenceImage: null });
  };

  const handleGenerate = async () => {
    if (!apiUrl || !apiKey || !imageModel) return;
    if (!title || title.length < 2 || title.length > 6) return;

    const ratios = [
      { key: "3:4", value: "3/4", label: "竖版 (3:4)" },
      { key: "16:9", value: "16/9", label: "横版 (16:9)" },
    ];

    const newCovers = { ...covers };
    ratios.forEach((r) => {
      newCovers[r.key] = { ...newCovers[r.key], isGenerating: true, imageUrl: null, error: null };
    });
    update({ covers: newCovers });

    const userMessage = [];
    if (referenceImage) {
      userMessage.push({ type: "image_url", image_url: { url: referenceImage } });
    }
    userMessage.push({ type: "text", text: "请参考上述要求生成短视频封面图" });

    const results = await Promise.allSettled(
      ratios.map(async (r) => {
        const systemPrompt = buildRatioPrompt(title, episodeNumber, r.value, r.label, requirements, !!referenceImage);
        return await chatCompletion({
          apiUrl, apiKey, model: imageModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });
      })
    );

    const finalCovers = { ...covers };
    results.forEach((result, i) => {
      const key = ratios[i].key;
      if (result.status === "fulfilled") {
        const content = result.value.choices?.[0]?.message?.content || "";
        // Try to extract URLs from markdown or direct URLs
        const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
        const urlMatch = content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp))/i);
        const imageUrl = mdMatch ? mdMatch[1] : urlMatch ? urlMatch[0] : content.trim();
        finalCovers[key] = {
          ...finalCovers[key],
          isGenerating: false,
          imageUrl: imageUrl.startsWith("http") ? imageUrl : null,
          error: imageUrl.startsWith("http") ? null : (imageUrl || "未能从返回内容中提取图片URL"),
          prompt: content,
        };
      } else {
        finalCovers[key] = {
          ...finalCovers[key],
          isGenerating: false,
          error: result.reason?.message || "生成失败",
        };
      }
    });
    update({ covers: finalCovers });
  };

  const handleRegenRatio = async (ratioKey, extraPrompt) => {
    if (!apiUrl || !apiKey || !imageModel) return;
    const ratioMap = { "3:4": { value: "3/4", label: "竖版 (3:4)" }, "16:9": { value: "16/9", label: "横版 (16:9)" } };
    const r = ratioMap[ratioKey];

    const newCovers = { ...coverState.covers };
    newCovers[ratioKey] = { ...newCovers[ratioKey], isGenerating: true, error: null };
    update({ covers: newCovers });

    try {
      const userMessage = [];
      if (referenceImage) {
        userMessage.push({ type: "image_url", image_url: { url: referenceImage } });
      }
      userMessage.push({ type: "text", text: extraPrompt || "请重新生成封面图" });

      const data = await chatCompletion({
        apiUrl, apiKey, model: imageModel,
        messages: [
          { role: "system", content: buildRatioPrompt(title, episodeNumber, r.value, r.label, `${requirements} ${extraPrompt ? `补充要求：${extraPrompt}` : ""}`.trim(), !!referenceImage) },
          { role: "user", content: userMessage },
        ],
      });
      const content = data.choices?.[0]?.message?.content || "";
      const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
      const urlMatch = content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp))/i);
      const imageUrl = mdMatch ? mdMatch[1] : urlMatch ? urlMatch[0] : content.trim();

      const finalCovers = { ...coverState.covers };
      finalCovers[ratioKey] = {
        ...finalCovers[ratioKey],
        isGenerating: false,
        imageUrl: imageUrl.startsWith("http") ? imageUrl : null,
        error: imageUrl.startsWith("http") ? null : "未能提取图片URL",
        prompt: content,
      };
      update({ covers: finalCovers });
    } catch (err) {
      const finalCovers = { ...coverState.covers };
      finalCovers[ratioKey] = { ...finalCovers[ratioKey], isGenerating: false, error: err.message };
      update({ covers: finalCovers });
    }
  };

  const allGenerated = covers["3:4"]?.imageUrl && covers["16:9"]?.imageUrl && !covers["3:4"]?.isGenerating && !covers["16:9"]?.isGenerating;
  const anyGenerating = covers["3:4"]?.isGenerating || covers["16:9"]?.isGenerating;
  const canGenerate = apiUrl && apiKey && imageModel && title.length >= 2 && title.length <= 6;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Input Section */}
        <div className="glass-surface rounded-2xl p-5 sm:p-6 mb-6 border border-[var(--border-subtle)]">
          <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4 flex items-center gap-2">
            <Upload size={18} className="text-violet-400" />
            封面信息设置
          </h2>

          {/* Reference image upload */}
          <div className="mb-5">
            <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">参考底图（可选）</label>
            {referenceImage ? (
              <div className="relative inline-block">
                <img src={referenceImage} alt="参考图" className="h-28 rounded-xl object-cover border border-[var(--border-subtle)]" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
                ><X size={10} className="text-white" /></button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--border-default)] dark:hover:border-violet-500/30 hover:border-violet-500/30 dark:text-zinc-500 text-zinc-400 hover:text-violet-400 transition-colors"
              >
                <Upload size={16} /> <span className="text-xs">上传参考图片</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Title + Episode row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">
                封面标题 <span className="text-red-400">*</span>
                <span className={`ml-2 ${title.length >= 2 && title.length <= 6 ? "text-emerald-400" : "text-red-400"}`}>
                  {title.length}/6 字
                </span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => update({ title: e.target.value.slice(0, 6) })}
                placeholder="输入4-6字标题"
                maxLength={6}
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors"
              />
              {title.length > 0 && (title.length < 2 || title.length > 6) && (
                <p className="text-[10px] text-red-400 mt-1">标题需为 2-6 个字</p>
              )}
            </div>
            <div>
              <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">起始集数</label>
              <input
                type="number"
                value={episodeNumber}
                onChange={(e) => update({ episodeNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                min={1}
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-5">
            <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">
              可选要求 <span className="text-zinc-400">({requirements.length}/200)</span>
            </label>
            <textarea
              value={requirements}
              onChange={(e) => update({ requirements: e.target.value.slice(0, 200) })}
              placeholder="例如：科技感风格、深色背景、突出人物主体..."
              rows={3}
              maxLength={200}
              className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors resize-none"
            />
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || anyGenerating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed animate-pulse-glow"
            >
              <Sparkles size={16} />
              {anyGenerating ? "生成中..." : "一键生成"}
            </button>
            {!imageModel && (
              <p className="text-[10px] dark:text-zinc-500 text-zinc-400 flex items-center gap-1">
                <Info size={12} /> 请先在首页配置API并选择图像模型
              </p>
            )}
          </div>
        </div>

        {/* Results Section */}
        {(covers["3:4"]?.imageUrl || covers["16:9"]?.imageUrl || anyGenerating || covers["3:4"]?.error || covers["16:9"]?.error) && (
          <div className="mb-6">
            <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4">生成结果</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CoverResultCard
                ratioLabel="竖版 (3:4)"
                ratioValue="3/4"
                imageUrl={covers["3:4"]?.imageUrl}
                isGenerating={covers["3:4"]?.isGenerating}
                error={covers["3:4"]?.error}
                regenerating={covers["3:4"]?.isGenerating}
                onRegenerate={() => handleRegenRatio("3:4")}
                onRegenerateWithPrompt={(prompt) => handleRegenRatio("3:4", prompt)}
                filename={`${title}_第${episodeNumber}集_3x4.png`}
              />
              <CoverResultCard
                ratioLabel="横版 (16:9)"
                ratioValue="16/9"
                imageUrl={covers["16:9"]?.imageUrl}
                isGenerating={covers["16:9"]?.isGenerating}
                error={covers["16:9"]?.error}
                regenerating={covers["16:9"]?.isGenerating}
                onRegenerate={() => handleRegenRatio("16:9")}
                onRegenerateWithPrompt={(prompt) => handleRegenRatio("16:9", prompt)}
                filename={`${title}_第${episodeNumber}集_16x9.png`}
              />
            </div>
          </div>
        )}

        {/* Next Step */}
        {allGenerated && (
          <div className="flex justify-center pb-4">
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 transition-all duration-200 active:scale-95"
            >
              下一步 — 集数编辑与批量下载
              <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
