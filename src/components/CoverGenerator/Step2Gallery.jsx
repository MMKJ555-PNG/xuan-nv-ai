import { useState } from "react";
import { Download, ChevronLeft, Plus, Trash2, Eye, PackageOpen, Check } from "lucide-react";

function downloadImageUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "cover.png";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function Step2Gallery({ coverState, onCoverStateChange, onBack }) {
  const { title, covers, gallery } = coverState;
  const [preview, setPreview] = useState(null);   // { "3:4": url, "16:9": url, title }
  const [savedMsg, setSavedMsg] = useState("");

  const update = (patch) => onCoverStateChange({ ...coverState, ...patch });

  const handleSaveToGallery = () => {
    const item = {
      id: Date.now(),
      title: title || "未命名",
      createdAt: new Date().toISOString(),
      "3:4": covers["3:4"]?.imageUrl || null,
      "16:9": covers["16:9"]?.imageUrl || null,
    };
    const newGallery = [item, ...gallery];
    update({ gallery: newGallery });
    setSavedMsg("已保存到作品库");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const handleDeleteFromGallery = (id) => {
    update({ gallery: gallery.filter((g) => g.id !== id) });
    if (preview?.id === id) setPreview(null);
  };

  const handleDownloadItem = (item, ratioKey) => {
    const url = item[ratioKey];
    if (url) {
      const ratioLabel = ratioKey === "3:4" ? "3x4" : "16x9";
      downloadImageUrl(url, `${item.title}_${ratioLabel}.png`);
    }
  };

  const hasAnyCover = covers["3:4"]?.imageUrl || covers["16:9"]?.imageUrl;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Save current covers to gallery */}
        {hasAnyCover && (
          <div className="glass-surface rounded-2xl p-5 sm:p-6 mb-6 border border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-violet-400" />
              保存当前封面到作品库
            </h2>
            <p className="text-xs dark:text-zinc-500 text-zinc-600 mb-4">
              将第1步生成的 "{title || "未命名"}" 封面保存到本地作品库，方便随时查看和下载
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {covers["3:4"]?.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)]" style={{ aspectRatio: "3/4" }}>
                  <img src={covers["3:4"].imageUrl} alt="3:4" className="w-full h-full object-cover" />
                </div>
              )}
              {covers["16:9"]?.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)]" style={{ aspectRatio: "16/9" }}>
                  <img src={covers["16:9"].imageUrl} alt="16:9" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveToGallery}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 active:scale-95"
              >
                <Plus size={14} />
                保存到作品库
              </button>
              {savedMsg && (
                <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={12} />{savedMsg}</span>
              )}
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold dark:text-zinc-200 text-zinc-800 flex items-center gap-2">
              <PackageOpen size={18} className="text-violet-400" />
              作品库
              {gallery.length > 0 && (
                <span className="text-xs dark:text-zinc-500 text-zinc-400 font-normal">({gallery.length} 件作品)</span>
              )}
            </h2>
          </div>

          {gallery.length === 0 ? (
            <div className="glass-surface rounded-2xl p-10 text-center border border-[var(--border-subtle)]">
              <PackageOpen size={40} className="dark:text-zinc-600 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm dark:text-zinc-500 text-zinc-500 mb-1">作品库为空</p>
              <p className="text-xs dark:text-zinc-600 text-zinc-400">在"第1步"生成封面后，点击"保存到作品库"即可在此管理</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((item) => (
                <div key={item.id} className="glass-surface rounded-2xl overflow-hidden border border-[var(--border-subtle)] group/gallery">
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold dark:text-zinc-300 text-zinc-700 truncate max-w-[140px]">{item.title}</p>
                      <p className="text-[10px] dark:text-zinc-500 text-zinc-400">
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreview(item)}
                        className="size-7 rounded-lg flex items-center justify-center dark:hover:bg-white/[0.06] hover:bg-zinc-100 transition-colors"
                        title="预览"
                      ><Eye size={13} className="dark:text-zinc-400 text-zinc-500" /></button>
                      <button
                        onClick={() => handleDeleteFromGallery(item.id)}
                        className="size-7 rounded-lg flex items-center justify-center dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
                        title="删除"
                      ><Trash2 size={13} className="dark:text-zinc-400 text-zinc-500 hover:text-red-400" /></button>
                    </div>
                  </div>

                  {/* Thumbnails */}
                  <div className="p-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] dark:text-zinc-600 text-zinc-400 text-center mb-1">3:4</p>
                      <div style={{ aspectRatio: "3/4" }} className="rounded-lg overflow-hidden bg-zinc-900/10 border border-[var(--border-subtle)]">
                        {item["3:4"] ? (
                          <img src={item["3:4"]} alt={`${item.title} 3:4`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <span className="text-[9px] dark:text-zinc-600 text-zinc-400">—</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] dark:text-zinc-600 text-zinc-400 text-center mb-1">16:9</p>
                      <div style={{ aspectRatio: "16/9" }} className="rounded-lg overflow-hidden bg-zinc-900/10 border border-[var(--border-subtle)]">
                        {item["16:9"] ? (
                          <img src={item["16:9"]} alt={`${item.title} 16:9`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <span className="text-[9px] dark:text-zinc-600 text-zinc-400">—</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick download */}
                  <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex gap-2">
                    <button
                      onClick={() => handleDownloadItem(item, "3:4")}
                      disabled={!item["3:4"]}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"
                    >
                      <Download size={10} />3:4
                    </button>
                    <button
                      onClick={() => handleDownloadItem(item, "16:9")}
                      disabled={!item["16:9"]}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"
                    >
                      <Download size={10} />16:9
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview modal */}
        {preview && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setPreview(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[700px] max-w-[92vw] dark:bg-zinc-900/95 bg-white/95 backdrop-blur-xl rounded-2xl border-[var(--border-default)] border shadow-2xl animate-message-in overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">{preview.title}</span>
                <button
                  onClick={() => setPreview(null)}
                  className="size-7 rounded-lg flex items-center justify-center dark:hover:bg-white/[0.06] hover:bg-zinc-100 transition-colors"
                ><ChevronLeft size={16} className="dark:text-zinc-400 text-zinc-600" /></button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 font-medium">竖版 (3:4)</p>
                  <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-zinc-900/10" style={{ aspectRatio: "3/4" }}>
                    {preview["3:4"] ? (
                      <img src={preview["3:4"]} alt={`${preview.title} 3:4`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="size-full flex items-center justify-center"><span className="text-xs dark:text-zinc-600 text-zinc-400">暂无</span></div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadItem(preview, "3:4")}
                    disabled={!preview["3:4"]}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"
                  ><Download size={12} />下载 3:4</button>
                </div>
                <div>
                  <p className="text-xs dark:text-zinc-500 text-zinc-600 mb-2 font-medium">横版 (16:9)</p>
                  <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-zinc-900/10" style={{ aspectRatio: "16/9" }}>
                    {preview["16:9"] ? (
                      <img src={preview["16:9"]} alt={`${preview.title} 16:9`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="size-full flex items-center justify-center"><span className="text-xs dark:text-zinc-600 text-zinc-400">暂无</span></div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadItem(preview, "16:9")}
                    disabled={!preview["16:9"]}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-95 disabled:opacity-30"
                  ><Download size={12} />下载 16:9</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Back button */}
        <div className="flex justify-center pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium dark:bg-white/[0.05] bg-zinc-100 dark:hover:bg-white/[0.08] hover:bg-zinc-200 border-[var(--border-subtle)] border dark:text-zinc-400 text-zinc-600 transition-all duration-200 active:scale-95"
          >
            <ChevronLeft size={16} />
            返回封面生成
          </button>
        </div>
      </div>
    </div>
  );
}
