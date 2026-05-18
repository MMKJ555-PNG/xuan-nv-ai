import { useState, useRef } from "react";
import { ArrowLeft, Sun, Moon, Hexagon, Upload, X, Sparkles, Info, Image, Download, Trash2, Eye, PackageOpen, Check, Plus } from "lucide-react";
import { chatCompletion } from "../services/api";

/**
 * 构建优化后的封面生成提示词。
 * 核心约束：
 * 1. 封面上只允许出现标题文字，禁止任何其他文字
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
    "【生成任务】",
    `请生成一张比例为 ${ratioLabel}（宽高比 ${ratioValue}）的高质量短视频封面图。`,
    "",
    "【严格的文字约束 — 必须遵守】",
    `1. 封面上只能出现标题文字"${title}"，除此之外不得出现任何其他文字`,
    "2. 绝对禁止出现：集号、日期、英文、数字、副标题、水印、署名、第X集、任何额外字符",
    "3. 如果参考图中包含文字，请忽略这些文字，仅将标题作为唯一文字元素融入画面",
    "",
    "【标题文字设计规范】",
    `1. 标题"${title}"必须经过精心排版设计，成为画面的视觉焦点`,
    "2. 字体风格：使用大气醒目的艺术字体，笔画清晰有力，具有设计感",
    "3. 排版位置：根据构图美感放置在视觉最佳位置（如居中偏上、黄金分割点）",
    "4. 配色方案：文字颜色需与背景形成强烈对比，确保高可读性，可使用渐变、描边或阴影增强效果",
    "5. 视觉效果：文字应具有立体感或光影质感，与整体画面完美融合",
    "",
    "【设计风格要求】",
    `${styleGuide}`,
    ...(hasReference ? [
      "如果用户提供了参考底图，请仔细分析参考图的色调、氛围、构图风格和视觉语言，",
      "将这些风格元素融入生成的封面中，确保生成结果与参考图的视觉调性一致。",
    ] : []),
    "",
    "【输出要求】",
    "请直接输出封面图片的URL链接。图片应为高质量、分辨率充足、可直接用于短视频平台的封面图。",
  ];

  return lines.join("\n");
}

function downloadImageUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "cover.png";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function CoverGenerator({ coverState, onCoverStateChange, apiUrl, apiKey, models, theme, onThemeToggle, onBackToHome }) {
  const fileInputRef = useRef(null);
  const [customModel, setCustomModel] = useState(coverState.coverModel || "");
  const [galleryPreview, setGalleryPreview] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");

  const referenceImage = coverState?.referenceImage || null;
  const title = coverState?.title || "";
  const requirements = coverState?.requirements || "";
  const covers = coverState?.covers || { "3:4": { imageUrl: null, prompt: "", isGenerating: false }, "16:9": { imageUrl: null, prompt: "", isGenerating: false } };
  const coverModel = coverState?.coverModel || "";
  const gallery = coverState?.gallery || [];
  const update = (patch) => onCoverStateChange({ ...coverState, ...patch });
  const activeModel = coverModel || models[0]?.id || "";

  // --- Image upload ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => update({ referenceImage: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // --- Generate ---
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
          error: imageUrl.startsWith("http") ? null : (imageUrl || "未能提取图片URL"),
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
      const extraH = extraPrompt ? `\n补充设计要求：${extraPrompt}` : "";
      const userMessage = [];
      if (referenceImage) {
        userMessage.push({ type: "image_url", image_url: { url: referenceImage } });
      }
      userMessage.push({ type: "text", text: "请重新生成封面图，严格确保画面中只包含标题文字。" + extraH });

      const data = await chatCompletion({
        apiUrl, apiKey, model: activeModel,
        messages: [
          { role: "system", content: buildCoverPrompt(title, r.value, r.label, requirements + extraH, !!referenceImage) },
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

  // --- Gallery actions ---
  const handleSaveToGallery = () => {
    const item = {
      id: Date.now(),
      title: title || "未命名",
      createdAt: new Date().toISOString(),
      "3:4": covers["3:4"]?.imageUrl || null,
      "16:9": covers["16:9"]?.imageUrl || null,
    };
    update({ gallery: [item, ...gallery] });
    setSavedMsg("已保存到作品库");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const handleDeleteFromGallery = (id) => {
    update({ gallery: gallery.filter((g) => g.id !== id) });
    if (galleryPreview?.id === id) setGalleryPreview(null);
  };

  const anyGenerating = covers["3:4"]?.isGenerating || covers["16:9"]?.isGenerating;
  const canGenerate = apiUrl && apiKey && activeModel && title.length >= 2 && title.length <= 6;
  const hasAnyCover = covers["3:4"]?.imageUrl || covers["16:9"]?.imageUrl;

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
        <div className="relative z-10">
          <button
            onClick={onThemeToggle}
            className="size-8 rounded-lg dark:hover:bg-white/[0.06] hover:bg-zinc-100 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          >
            {theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[960px] mx-auto px-4 py-6">
          {/* --- Input Section --- */}
          <div className="glass-surface rounded-2xl p-5 sm:p-6 mb-6 border border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4 flex items-center gap-2">
              <Upload size={18} className="text-violet-400" />
              封面信息设置
            </h2>

            {/* Reference image */}
            <div className="mb-5">
              <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">参考底图（可选）</label>
              {referenceImage ? (
                <div className="relative inline-block">
                  <img src={referenceImage} alt="参考图" className="h-28 rounded-xl object-cover border border-[var(--border-subtle)]" />
                  <button onClick={() => update({ referenceImage: null })} className="absolute top-1 right-1 size-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"><X size={10} className="text-white" /></button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--border-default)] dark:hover:border-violet-500/30 hover:border-violet-500/30 dark:text-zinc-500 text-zinc-400 hover:text-violet-400 transition-colors"
                ><Upload size={16} /><span className="text-xs">上传参考图片</span></button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Title */}
            <div className="mb-5">
              <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium">
                封面标题 <span className="text-red-400">*</span>
                <span className={`ml-2 ${title.length >= 2 && title.length <= 6 ? "text-emerald-400" : "text-red-400"}`}>{title.length}/6 字</span>
              </label>
              <input
                type="text" value={title} onChange={(e) => update({ title: e.target.value.slice(0, 6) })}
                placeholder="输入2-6字封面标题（封面上仅显示此标题文字）" maxLength={6}
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
                value={requirements} onChange={(e) => update({ requirements: e.target.value.slice(0, 200) })}
                placeholder="例如：赛博朋克风格、深色调、居中构图、霓虹灯效果..." rows={3} maxLength={200}
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors resize-none"
              />
            </div>

            {/* Independent Model Selector */}
            <div className="mb-5">
              <label className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 block font-medium flex items-center gap-1">
                <Image size={12} className="text-violet-400" />
                AI 图像生成模型
              </label>
              <select
                value={models.some(m => m.id === activeModel) ? activeModel : (activeModel ? "__custom__" : "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    update({ coverModel: customModel || "" });
                  } else {
                    update({ coverModel: val });
                  }
                }}
                className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-sm dark:text-white text-zinc-800 outline-none focus:border-violet-500/40 transition-colors"
              >
                <option value="">— 选择模型 —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                <option value="__custom__">— 手动输入模型 —</option>
              </select>
              {(!models.some(m => m.id === activeModel) || activeModel === customModel) && activeModel && (
                <input
                  type="text" value={customModel || activeModel}
                  onChange={(e) => { setCustomModel(e.target.value); update({ coverModel: e.target.value }); }}
                  placeholder="输入模型 ID，例如：gpt-4o 或 dall-e-3"
                  className="w-full dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-2.5 text-xs dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors font-mono mt-2"
                />
              )}
              {!activeModel && (
                <p className="text-[10px] dark:text-zinc-500 text-zinc-400 mt-1">请选择或手动输入用于生成封面图像的AI模型</p>
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
                <p className="text-[10px] dark:text-zinc-500 text-zinc-400 flex items-center gap-1"><Info size={12} />请在下方选择图像生成模型</p>
              )}
            </div>
          </div>

          {/* --- Results + Save --- */}
          {(hasAnyCover || anyGenerating || covers["3:4"]?.error || covers["16:9"]?.error) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800">生成结果</h2>
                {hasAnyCover && !anyGenerating && (
                  <button
                    onClick={handleSaveToGallery}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95"
                  ><Plus size={11} />保存到作品库</button>
                )}
              </div>
              {savedMsg && (
                <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1"><Check size={12} />{savedMsg}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CoverCard ratioLabel="竖版 (3:4)" ratioValue="3/4" coverData={covers["3:4"]} filename={`${title}_3x4.png`}
                  onRegenerate={() => handleRegenRatio("3:4")}
                  onRegenerateWithPrompt={(p) => handleRegenRatio("3:4", p)} />
                <CoverCard ratioLabel="横版 (16:9)" ratioValue="16/9" coverData={covers["16:9"]} filename={`${title}_16x9.png`}
                  onRegenerate={() => handleRegenRatio("16:9")}
                  onRegenerateWithPrompt={(p) => handleRegenRatio("16:9", p)} />
              </div>
            </div>
          )}

          {/* --- Gallery (history area) --- */}
          <div>
            <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4 flex items-center gap-2">
              <PackageOpen size={18} className="text-violet-400" />
              作品库
              {gallery.length > 0 && (
                <span className="text-xs dark:text-zinc-500 text-zinc-400 font-normal">({gallery.length} 件)</span>
              )}
            </h2>

            {gallery.length === 0 ? (
              <div className="glass-surface rounded-2xl p-10 text-center border border-[var(--border-subtle)]">
                <PackageOpen size={40} className="dark:text-zinc-600 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm dark:text-zinc-500 text-zinc-500 mb-1">作品库为空</p>
                <p className="text-xs dark:text-zinc-600 text-zinc-400">生成封面后，点击"保存到作品库"即可在此管理</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map((item) => (
                  <div key={item.id} className="glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)] group/gallery">
                    <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold dark:text-zinc-300 text-zinc-700 truncate max-w-[140px]">{item.title}</p>
                        <p className="text-[10px] dark:text-zinc-500 text-zinc-400">{new Date(item.createdAt).toLocaleDateString("zh-CN")}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setGalleryPreview(item)} className="size-7 rounded-lg flex items-center justify-center dark:hover:bg-white/[0.06] hover:bg-zinc-100 transition-colors" title="预览"><Eye size={13} className="dark:text-zinc-400 text-zinc-500" /></button>
                        <button onClick={() => handleDeleteFromGallery(item.id)} className="size-7 rounded-lg flex items-center justify-center dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors" title="删除"><Trash2 size={13} className="dark:text-zinc-400 text-zinc-500 hover:text-red-400" /></button>
                      </div>
                    </div>
                    <div className="p-2.5 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] dark:text-zinc-600 text-zinc-400 text-center mb-1">3:4</p>
                        <div style={{ aspectRatio: "3/4" }} className="rounded-lg overflow-hidden bg-zinc-900/10 border border-[var(--border-subtle)]">
                          {item["3:4"] ? <img src={item["3:4"]} alt="" className="w-full h-full object-cover" /> : <div className="size-full flex items-center justify-center"><span className="text-[9px] dark:text-zinc-600 text-zinc-400">—</span></div>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] dark:text-zinc-600 text-zinc-400 text-center mb-1">16:9</p>
                        <div style={{ aspectRatio: "16/9" }} className="rounded-lg overflow-hidden bg-zinc-900/10 border border-[var(--border-subtle)]">
                          {item["16:9"] ? <img src={item["16:9"]} alt="" className="w-full h-full object-cover" /> : <div className="size-full flex items-center justify-center"><span className="text-[9px] dark:text-zinc-600 text-zinc-400">—</span></div>}
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex gap-2">
                      <button onClick={() => item["3:4"] && downloadImageUrl(item["3:4"], `${item.title}_3x4.png`)} disabled={!item["3:4"]} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"><Download size={10} />3:4</button>
                      <button onClick={() => item["16:9"] && downloadImageUrl(item["16:9"], `${item.title}_16x9.png`)} disabled={!item["16:9"]} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"><Download size={10} />16:9</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery preview modal */}
      {galleryPreview && (<>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setGalleryPreview(null)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[700px] max-w-[92vw] dark:bg-zinc-900/95 bg-white/95 backdrop-blur-xl rounded-2xl border-[var(--border-default)] border shadow-2xl animate-message-in overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">{galleryPreview.title}</span>
            <button onClick={() => setGalleryPreview(null)} className="size-7 rounded-lg flex items-center justify-center dark:hover:bg-white/[0.06] hover:bg-zinc-100 transition-colors"><X size={16} className="dark:text-zinc-400 text-zinc-600" /></button>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 font-medium">竖版 (3:4)</p>
              <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-zinc-900/10" style={{ aspectRatio: "3/4" }}>
                {galleryPreview["3:4"] ? <img src={galleryPreview["3:4"]} alt="" className="w-full h-full object-contain" /> : <div className="size-full flex items-center justify-center"><span className="text-xs dark:text-zinc-600 text-zinc-400">暂无</span></div>}
              </div>
              <button onClick={() => galleryPreview["3:4"] && downloadImageUrl(galleryPreview["3:4"], `${galleryPreview.title}_3x4.png`)} disabled={!galleryPreview["3:4"]} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"><Download size={12} />下载 3:4</button>
            </div>
            <div>
              <p className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 font-medium">横版 (16:9)</p>
              <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-zinc-900/10" style={{ aspectRatio: "16/9" }}>
                {galleryPreview["16:9"] ? <img src={galleryPreview["16:9"]} alt="" className="w-full h-full object-contain" /> : <div className="size-full flex items-center justify-center"><span className="text-xs dark:text-zinc-600 text-zinc-400">暂无</span></div>}
              </div>
              <button onClick={() => galleryPreview["16:9"] && downloadImageUrl(galleryPreview["16:9"], `${galleryPreview.title}_16x9.png`)} disabled={!galleryPreview["16:9"]} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"><Download size={12} />下载 16:9</button>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}

// --- Inline CoverCard component ---
function CoverCard({ ratioLabel, ratioValue, coverData, filename, onRegenerate, onRegenerateWithPrompt }) {
  const { imageUrl, isGenerating, error } = coverData || {};
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");

  const handleRegen = () => {
    setRegenOpen(false);
    onRegenerateWithPrompt(regenPrompt);
    setRegenPrompt("");
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (imageUrl) downloadImageUrl(imageUrl, filename || "cover.png");
  };

  return (
    <div className={`glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)] transition-all duration-300 ${imageUrl ? "hover:shadow-lg hover:shadow-violet-500/5" : ""}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] sm:text-xs font-semibold dark:text-zinc-400 text-zinc-600 uppercase tracking-wider">{ratioLabel}</span>
        {imageUrl && !isGenerating && !error && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">已生成</span>}
        {isGenerating && <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">生成中</span>}
        {error && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">失败</span>}
      </div>
      <div className="relative" style={{ aspectRatio: ratioValue }}>
        {isGenerating ? (
          <div className="absolute inset-0 shimmer flex items-center justify-center"><p className="text-xs dark:text-zinc-500 text-zinc-400">AI 正在生成封面...</p></div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-500/5"><p className="text-xs text-red-400 px-4 text-center">{error}</p></div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={`封面 ${ratioLabel}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><p className="text-xs dark:text-zinc-600 text-zinc-400">等待生成</p></div>
        )}
      </div>
      {imageUrl && !isGenerating && (
        <div className="flex gap-2 px-4 py-2.5">
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95"><Download size={12} />下载</button>
          <button onClick={() => setRegenOpen(!regenOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95"><Sparkles size={12} />重新生成</button>
        </div>
      )}
      {error && (
        <div className="flex gap-2 px-4 py-2.5">
          <button onClick={onRegenerate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95"><Sparkles size={12} />重试</button>
        </div>
      )}
      {regenOpen && (
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <input type="text" value={regenPrompt} onChange={(e) => setRegenPrompt(e.target.value)} placeholder="输入补充要求（可选）" className="flex-1 dark:bg-white/[0.05] bg-zinc-100 border-[var(--border-default)] border rounded-lg px-3 py-1.5 text-xs dark:text-white text-zinc-800 dark:placeholder-zinc-500 placeholder-zinc-400 outline-none focus:border-violet-500/40 transition-colors" onKeyDown={(e) => { if (e.key === "Enter") handleRegen(); }} />
            <button onClick={handleRegen} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors active:scale-95">生成</button>
          </div>
        </div>
      )}
    </div>
  );
}
