export function normalizeApiBaseUrl(input) {
  const value = input?.trim();
  if (!value) throw new Error("请输入 API 地址");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("API 地址必须是完整的 HTTP(S) 地址");
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname) {
    throw new Error("API 地址必须使用 HTTP(S) 协议");
  }

  url.search = "";
  url.hash = "";
  let path = url.pathname.replace(/\/+$/, "");
  if (/\/v1$/i.test(path)) path = path.slice(0, -3);
  url.pathname = path || "/";
  return url.toString().replace(/\/$/, "");
}

export function buildOpenAIUrl(apiUrl, path) {
  const endpoint = path.replace(/^\/+/, "");
  return `${normalizeApiBaseUrl(apiUrl)}/v1/${endpoint}`;
}

async function readError(res) {
  const text = await res.text().catch(() => "");
  let detail;
  try {
    const payload = JSON.parse(text);
    detail = payload?.error?.message || payload?.message;
  } catch {
    detail = text.slice(0, 300);
  }
  if (detail) return detail;
  if (res.status === 401 || res.status === 403) return "API 密钥无效或无权访问";
  if (res.status === 404) return "API 地址不正确或接口不兼容 OpenAI 格式";
  if (res.status === 429) return "请求过于频繁或账户额度不足";
  return `API 请求失败（${res.status}）`;
}

async function requestJson({ apiUrl, apiKey, path, method = "GET", body, signal }) {
  const res = await fetch(buildOpenAIUrl(apiUrl, path), {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export function normalizeModelsResponse(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw new Error("模型接口响应格式无效，预期为 OpenAI 的 data 数组");
  }
  const seen = new Set();
  const models = [];
  for (const item of payload.data) {
    if (!item || typeof item !== "object" || typeof item.id !== "string") continue;
    const id = item.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({
      id,
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : id,
      source: "remote",
      ...(typeof item.owned_by === "string" && item.owned_by ? { ownedBy: item.owned_by } : {}),
    });
  }
  if (!models.length) throw new Error("模型接口响应中没有有效模型");
  return models;
}

export async function listModels({ apiUrl, apiKey, signal }) {
  const payload = await requestJson({ apiUrl, apiKey, path: "models", signal });
  return normalizeModelsResponse(payload);
}

export async function chatCompletion({ apiUrl, apiKey, model, messages, signal, ...extra }) {
  return requestJson({
    apiUrl,
    apiKey,
    path: "chat/completions",
    method: "POST",
    body: { model, messages, ...extra },
    signal,
  });
}

export async function imageGeneration({ apiUrl, apiKey, model, prompt, image, size, n, signal }) {
  return requestJson({
    apiUrl,
    apiKey,
    path: "images/generations",
    method: "POST",
    body: { model, prompt, n: n || 1, size: size || "1024x1024", ...(image ? { image } : {}) },
    signal,
  });
}

export async function chatCompletionStream({ apiUrl, apiKey, model, messages, onChunk, signal, ...extra }) {
  const res = await fetch(buildOpenAIUrl(apiUrl, "chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true, ...extra }),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  if (!res.body) throw new Error("API 未返回可读取的流式响应");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulator = "";
  let lastFlush = 0;
  const FRAME_MS = 33;

  const flush = () => {
    if (accumulator) {
      onChunk(accumulator);
      accumulator = "";
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") { flush(); return; }
      try {
        const content = JSON.parse(data).choices?.[0]?.delta?.content;
        if (content) {
          accumulator += content;
          const now = Date.now();
          if (now - lastFlush >= FRAME_MS) {
            flush();
            lastFlush = now;
          }
        }
      } catch {
        // Ignore non-JSON SSE metadata frames.
      }
    }
  }
  flush();
}
