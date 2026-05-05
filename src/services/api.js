export async function chatCompletion({ apiUrl, apiKey, model, messages }) {
  const res = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}

export async function chatCompletionStream({ apiUrl, apiKey, model, messages, onChunk }) {
  const res = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
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
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") { flush(); return; }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          accumulator += content;
          const now = Date.now();
          if (now - lastFlush >= FRAME_MS) {
            flush();
            lastFlush = now;
          }
        }
      } catch {
        // skip unparseable chunks
      }
    }
  }
  flush();
}
