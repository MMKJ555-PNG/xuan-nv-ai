import { useState, useRef } from "react";
import { Upload, X, Sparkles, Info, Image } from "lucide-react";
import CoverResultCard from "./CoverResultCard";
import { chatCompletion } from "../../services/api";

/**
 * 构建优化后的封面生成提示词。
 * 核心约束：
 * 1. 封面上只允许出现标题文字，禁止任何其他文字（无序数字、无日期、无副标题、无水印等）
 * 2. 标题文字必须经过精心设计，具有高视觉吸引力
 * 3. 整体风格应契合用户上传的参考图风格
 * 4. 所有输出为中文
 */
function buildCoverPrompt(title, ratioValue, ratioLabel, requirements, hasReference) {
  const styleGuide = requirements
    ? `整体设计风格要求：${requirements}`
    : "整体设计风格：现代简约、高级质感、适合短视频平台展示，色彩搭配协调，构图具有视觉冲击力";

  const lines = [
    "你是一位资深短视频封面设计师，拥有顶级的视觉审美和排版能力。",
    "",
    `【生成任务】`,
    `请生成一张比例为 ${ratioLabel}（宽高比 ${ratioValue}）的高质量短视频封面图。`,
    "",
    `【严格的文字约束 — 必须遵守】`,
    `1. 封面上只能出现标题文字"${title}"，除此之外不得出现任何其他文字`,
    `2. 绝对禁止出现：集号、日期、英文、数字、副标题、水印、署名、第X集、任何额外字符`,
    `3. 如果参考图中包含文字，请忽略这些文字，仅将"${title}"作为唯一文字元素融入画面`,
    "",
    `【标题文字设计规范】`,
    `1. 标题"${title}"必须经过精心排版设计，成为画面的视觉焦点`,
    `2. 字体风格：使用大气醒目的艺术字体，笔画清晰有力，具有设计感`,
    `3. 排版位置：根据构图美感放置在视觉最佳位置（如居中偏上、黄金分割点）`,
    `4. 配色方案：文字颜色需与背景形成强烈对比，确保高可读性，可使用渐变、描边或阴影增强效果`,
    `5. 视觉效果：文字应具有立体感或光影质感，与整体画面完美融合，不显得突兀`,
    "",
    `【设计风格要求】`,
    `${styleGuide}`,
    ...(hasReference ? [
      "如果用户提供了参考底图，请仔细分析参考图的色调、氛围、构图风格和视觉语言，",
      "将这些风格元素融入生成的封面中，确保生成结果与参考图的视觉调性一致。",
    ] : []),
    "",
    `【输出要求】`,
    "请直接输出封面图片的URL链接。图片应为高质量、分辨率充足、可直接用于短视频平台的封面图。",
  ];

  return lines.join("\n");
}

export default function Step1CoverCreate({ coverState, onCoverStateChange, apiUrl, apiKey, models, onNext }) {
  const fileInputRef = useRef(null);
  const [customModel, setCustomModel] = useState(coverState.coverModel || "");

  const { referenceImage, title, requirements, covers, coverModel } = coverState;

  const update = (patch) => onCoverStateChange({ ...coverState, ...patch });

  const activeModel = coverModel || models[0]?.id || "";

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
    if (!apiUrl || !apiKey || !activeModel) return;
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
    userMessage.push({ type: "text", text: "请根据上述规范生成高品质短视频封面图。严格确保画面中只包含标题文字，无任何其他文字内容。" });

    const results = await Promise.allSettled(
      ratios.map(async (r) => {
        const systemPrompt = buildCoverPrompt(title, r.value, r.label, requirements, !!referenceImage);
        return await chatCompletion({
          apiUrl, apiKey, model: activeModel,
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
    if (!apiUrl || !apiKey || !activeModel) return;
    const ratioMap = { "3:4": { value: "3/4", label: "竖版 (3:4)" }, "16:9": { value: "16/9", label: "横版 (16:9)" } };
    const r = ratioMap[ratioKey];

    const newCovers = { ...coverState.covers };
    newCovers[ratioKey] = { ...newCovers[ratioKey], isGenerating: true, error: null };
    update({ covers: newCovers });

    try {
      const extraHint = extraPrompt ? `\n补充设计要求：${extraPrompt}` : "";
      const userMessage = [];
      if (referenceImage) {
        userMessage.push({ type: "image_url", image_url: { url: referenceImage } });
      }
      userMessage.push({ type: "text", text: "请重新生成封面图，严格确保画面中只包含标题文字。" + extraHint });

      const data = await chatCompletion({
        apiUrl, apiKey, model: activeModel,
        messages: [
          { role: "system", content: buildCoverPrompt(title, r.value, r.label, requirements + extraHint, !!referenceImage) },
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
  const canGenerate = apiUrl && apiKey && activeModel && title.length >= 2 && title.length <= 6;

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

          {/* Title */}
          <div className="mb-5">
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
              placeholder="输入2-6字封面标题（封面上仅显示此标题文字）"
              maxLength={6}
              className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors"
            />
            {title.length > 0 && (title.length < 2 || title.length > 6) && (
              <p className="text-[10px] text-red-400 mt-1">标题需为 2-6 个字</p>
            )}
          </div>

          {/* Requirements */}
          <div className="mb-5">
            <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">
              设计要求（可选）<span className="text-zinc-400">({requirements.length}/200)</span>
            </label>
            <textarea
              value={requirements}
              onChange={(e) => update({ requirements: e.target.value.slice(0, 200) })}
              placeholder="例如：赛博朋克风格、深色调、居中构图、霓虹灯效果..."
              rows={3}
              maxLength={200}
              className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors resize-none"
            />
          </div>

          {/* Model Selector — independent, manual input */}
          <div className="mb-5">
            <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium flex items-center gap-1">
              <Image size={12} className="text-violet-400" />
              AI 图像生成模型
            </label>
            <div className="flex gap-2">
              <select
                value={activeModel}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    update({ coverModel: customModel || "" });
                  } else {
                    update({ coverModel: val });
                  }
                }}
                className="flex-1 dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 outline-none focus:border-violet-500/40 transition-colors"
              >
                <option value="">— 选择模型 —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                <option value="__custom__">— 手动输入模型 —</option>
              </select>
            </div>
            {(activeModel === customModel || !models.some(m => m.id === activeModel)) && activeModel && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customModel || activeModel}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    update({ coverModel: e.target.value });
                  }}
                  placeholder="输入模型 ID，例如：gpt-4o 或 dall-e-3"
                  className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-xs dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors font-mono"
                />
              </div>
            )}
            {!activeModel && (
              <p className="text-[10px] dark:text-zinc-500 text-zinc-400 mt-1">
                请选择或手动输入用于生成封面图像的AI模型
              </p>
            )}
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
            {!activeModel && apiUrl && apiKey && (
              <p className="text-[10px] dark:text-zinc-500 text-zinc-400 flex items-center gap-1">
                <Info size={12} /> 请在下方选择图像生成模型
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
                filename={`${title}_3x4.png`}
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
                filename={`${title}_16x9.png`}
              />
            </div>
          </div>
        )}

        {/* Next Step */}
        {allGenerated && (
          <div className="flex justify-center pb-4 gap-3">
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 transition-all duration-200 active:scale-95"
            >
              下一步 — 作品库
              <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
