const ROOT_NAME = "xuannv-chats";
const CHATS_NAME = "chats";
const CHAT_FILE = "chat.json";
const MANIFEST_FILE = "manifest.json";
const SCHEMA_VERSION = 1;

async function writeJson(directory, name, value) {
  const fileHandle = await directory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(value, null, 2));
  await writable.close();
}

async function readJson(directory, name) {
  const fileHandle = await directory.getFileHandle(name);
  const file = await fileHandle.getFile();
  if (file.size > 50 * 1024 * 1024) throw new Error(`${name} 文件过大`);
  return JSON.parse(await file.text());
}

function validateId(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("对话 ID 无效");
  return id;
}

function normalizeChat(chat) {
  if (!chat || typeof chat !== "object") throw new Error("对话文件格式无效");
  const id = validateId(chat.id);
  return {
    ...chat,
    id,
    title: typeof chat.title === "string" && chat.title ? chat.title : "新对话",
    mode: chat.mode === "image" ? "image" : "text",
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    createdAt: Number.isFinite(chat.createdAt) ? chat.createdAt : 0,
    updatedAt: Number.isFinite(chat.updatedAt) ? chat.updatedAt : 0,
    revision: Number.isInteger(chat.revision) ? chat.revision : 0,
  };
}

export async function openChatStore(directoryHandle) {
  const root = await directoryHandle.getDirectoryHandle(ROOT_NAME, { create: true });
  const chats = await root.getDirectoryHandle(CHATS_NAME, { create: true });
  return { directoryHandle, root, chats };
}

async function updateManifest(store, chats) {
  await writeJson(store.root, MANIFEST_FILE, {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    chats: chats.map(({ id, title, mode, createdAt, updatedAt, revision }) => ({ id, title, mode, createdAt, updatedAt, revision })),
  });
}

function dataUrlToBlob(value) {
  const [header, encoded] = value.split(",", 2);
  const mime = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function writeMedia(directory, blob, path) {
  const extension = blob.type.split("/")[1]?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const name = `${path.replace(/[^a-zA-Z0-9_-]/g, "_")}.${extension}`;
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return `local-media:${name}`;
}

async function serializeMedia(directory, value, path = "root") {
  if (typeof value === "string" && value.startsWith("data:")) {
    return writeMedia(directory, dataUrlToBlob(value), path);
  }
  if (typeof value === "string" && /_images_\d+$/.test(path) && /^https?:\/\//.test(value)) {
    try {
      const response = await fetch(value);
      if (response.ok) return writeMedia(directory, await response.blob(), path);
    } catch {
      // Keep the remote URL when CORS or network policy blocks downloading.
    }
    return value;
  }
  if (Array.isArray(value)) return Promise.all(value.map((item, index) => serializeMedia(directory, item, `${path}_${index}`)));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await serializeMedia(directory, item, `${path}_${key}`)])));
}

async function hydrateMedia(directory, value) {
  if (typeof value === "string" && value.startsWith("local-media:")) {
    const name = value.slice(12);
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error("媒体路径无效");
    return blobToDataUrl(await (await directory.getFileHandle(name)).getFile());
  }
  if (Array.isArray(value)) return Promise.all(value.map((item) => hydrateMedia(directory, item)));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await hydrateMedia(directory, item)])));
}

export async function loadChats(store) {
  const chats = [];
  for await (const [name, handle] of store.chats.entries()) {
    if (handle.kind !== "directory") continue;
    try {
      validateId(name);
      const chat = normalizeChat(await readJson(handle, CHAT_FILE));
      const media = await handle.getDirectoryHandle("media", { create: true });
      if (chat.id === name) chats.push(await hydrateMedia(media, chat));
    } catch (error) {
      console.warn(`[chatFileStore] 跳过损坏的对话 ${name}:`, error);
    }
  }
  chats.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  await updateManifest(store, chats);
  return chats;
}

export async function saveChat(store, chat) {
  const normalized = normalizeChat(chat);
  const directory = await store.chats.getDirectoryHandle(normalized.id, { create: true });
  const media = await directory.getDirectoryHandle("media", { create: true });
  const serializable = await serializeMedia(media, normalized);
  const next = {
    ...serializable,
    schemaVersion: SCHEMA_VERSION,
    revision: normalized.revision + 1,
    updatedAt: Date.now(),
  };
  await writeJson(directory, CHAT_FILE, next);
  return { ...normalized, revision: next.revision, updatedAt: next.updatedAt };
}

export async function deleteChatFiles(store, chatId) {
  await store.chats.removeEntry(validateId(chatId), { recursive: true });
}

export async function rebuildManifest(store, chats) {
  await updateManifest(store, chats);
}
