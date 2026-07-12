import { useCallback, useEffect, useRef, useState } from "react";
import { deleteChatFiles, loadChats, openChatStore, rebuildManifest, saveChat } from "../services/chatFileStore";
import { isDirectoryStorageSupported, loadDirectoryHandle, saveDirectoryHandle } from "../services/directoryHandleStore";

const SAVE_DELAY = 500;

export default function useChatDirectory() {
  const supported = isDirectoryStorageSupported();
  const [status, setStatus] = useState(supported ? "loading" : "unsupported");
  const [directoryName, setDirectoryName] = useState("");
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  const storeRef = useRef(null);
  const chatsRef = useRef([]);
  const writeChainsRef = useRef(new Map());
  const pendingRef = useRef(new Map());
  const timersRef = useRef(new Map());
  const deletedRef = useRef(new Set());
  const connectionRef = useRef(0);

  const replaceChats = useCallback((next) => {
    chatsRef.current = next;
    setChats(next);
  }, []);

  const resetConnectionState = useCallback(() => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
    pendingRef.current.clear();
    writeChainsRef.current.clear();
    deletedRef.current.clear();
    connectionRef.current += 1;
  }, []);

  const persistSnapshot = useCallback((chat) => {
    if (!storeRef.current || deletedRef.current.has(chat.id)) return Promise.reject(new Error("聊天文件夹未就绪"));
    const store = storeRef.current;
    const connection = connectionRef.current;
    const previous = writeChainsRef.current.get(chat.id) || Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      if (deletedRef.current.has(chat.id) || connection !== connectionRef.current) return null;
      return saveChat(store, chat);
    });
    writeChainsRef.current.set(chat.id, operation);
    operation.finally(() => {
      if (writeChainsRef.current.get(chat.id) === operation) writeChainsRef.current.delete(chat.id);
    });
    return operation;
  }, []);

  const flushChat = useCallback(async (chatId) => {
    const timer = timersRef.current.get(chatId);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(chatId);
    const snapshot = pendingRef.current.get(chatId);
    if (!snapshot) return null;
    pendingRef.current.delete(chatId);
    try {
      const saved = await persistSnapshot(snapshot);
      if (saved) {
        const current = chatsRef.current.find((chat) => chat.id === chatId);
        if (current) {
          const next = chatsRef.current.map((chat) => chat.id === chatId
            ? { ...chat, revision: saved.revision, updatedAt: saved.updatedAt }
            : chat);
          replaceChats(next);
        }
      }
      return saved;
    } catch (cause) {
      setError(cause.message || "保存对话失败");
      throw cause;
    }
  }, [persistSnapshot, replaceChats]);

  const scheduleSave = useCallback((chat) => {
    pendingRef.current.set(chat.id, chat);
    const existing = timersRef.current.get(chat.id);
    if (existing) clearTimeout(existing);
    timersRef.current.set(chat.id, setTimeout(() => {
      flushChat(chat.id).catch(() => {});
    }, SAVE_DELAY));
  }, [flushChat]);

  const connect = useCallback(async (handle, requestPermission = false) => {
    setStatus("loading");
    setError("");
    try {
      let permission = await handle.queryPermission({ mode: "readwrite" });
      if (permission === "prompt" && requestPermission) permission = await handle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        setDirectoryName(handle.name || "");
        setStatus("permission-required");
        return false;
      }
      resetConnectionState();
      const store = await openChatStore(handle);
      const loaded = await loadChats(store);
      storeRef.current = store;
      setDirectoryName(handle.name || "");
      replaceChats(loaded);
      setStatus("ready");
      return true;
    } catch (cause) {
      setError(cause.message || "无法读取聊天文件夹");
      setStatus("error");
      return false;
    }
  }, [replaceChats, resetConnectionState]);

  useEffect(() => {
    if (!supported) return;
    loadDirectoryHandle()
      .then((handle) => handle ? connect(handle) : setStatus("disconnected"))
      .catch(() => setStatus("disconnected"));
  }, [supported, connect]);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
  }, []);

  const chooseDirectory = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const connected = await connect(handle, true);
      if (connected) await saveDirectoryHandle(handle);
      return connected;
    } catch (cause) {
      if (cause.name !== "AbortError") {
        setError(cause.message || "无法选择聊天文件夹");
        setStatus("error");
      }
      return false;
    }
  }, [connect]);

  const restorePermission = useCallback(async () => {
    const handle = await loadDirectoryHandle();
    if (!handle) {
      setStatus("disconnected");
      return false;
    }
    return connect(handle, true);
  }, [connect]);

  const createChat = useCallback(async (chat) => {
    setError("");
    try {
      const saved = await persistSnapshot(chat);
      const next = [saved, ...chatsRef.current.filter((item) => item.id !== saved.id)];
      replaceChats(next);
      await rebuildManifest(storeRef.current, next);
      return saved;
    } catch (cause) {
      setError(cause.message || "创建对话文件失败");
      throw cause;
    }
  }, [persistSnapshot, replaceChats]);

  const updateChat = useCallback((chatId, updater) => {
    const existing = chatsRef.current.find((chat) => chat.id === chatId);
    if (!existing || deletedRef.current.has(chatId)) return Promise.resolve(null);
    const nextChat = typeof updater === "function" ? updater(existing) : updater;
    replaceChats(chatsRef.current.map((chat) => chat.id === chatId ? nextChat : chat));
    scheduleSave(nextChat);
    return Promise.resolve(nextChat);
  }, [replaceChats, scheduleSave]);

  const deleteChat = useCallback(async (chatId) => {
    deletedRef.current.add(chatId);
    setError("");
    try {
      await flushChat(chatId).catch(() => {});
      await (writeChainsRef.current.get(chatId) || Promise.resolve()).catch(() => {});
      await deleteChatFiles(storeRef.current, chatId);
      const next = chatsRef.current.filter((chat) => chat.id !== chatId);
      replaceChats(next);
      await rebuildManifest(storeRef.current, next);
      return next;
    } catch (cause) {
      deletedRef.current.delete(chatId);
      setError(cause.message || "删除对话文件失败");
      throw cause;
    }
  }, [flushChat, replaceChats]);

  const migrateLegacyChats = useCallback(async (legacyChats) => {
    if (!storeRef.current || !Array.isArray(legacyChats)) throw new Error("旧聊天数据无效");
    const existingIds = new Set(chatsRef.current.map((chat) => chat.id));
    let migrated = 0;
    for (const legacy of legacyChats) {
      const originalId = String(legacy?.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
      let id = originalId || globalThis.crypto.randomUUID();
      if (existingIds.has(id)) id = globalThis.crypto.randomUUID();
      existingIds.add(id);
      await saveChat(storeRef.current, {
        ...legacy,
        id,
        title: typeof legacy?.title === "string" ? legacy.title : "新对话",
        mode: legacy?.mode === "image" ? "image" : "text",
        messages: Array.isArray(legacy?.messages) ? legacy.messages : [],
        createdAt: Number.isFinite(legacy?.createdAt) ? legacy.createdAt : Date.now(),
        revision: 0,
      });
      migrated += 1;
    }
    replaceChats(await loadChats(storeRef.current));
    return migrated;
  }, [replaceChats]);

  const sync = useCallback(async () => {
    if (!storeRef.current || pendingRef.current.size || writeChainsRef.current.size) return;
    setStatus("syncing");
    try {
      replaceChats(await loadChats(storeRef.current));
      setStatus("ready");
    } catch (cause) {
      setError(cause.message || "同步聊天文件夹失败");
      setStatus("error");
    }
  }, [replaceChats]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && status === "ready") sync();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status, sync]);

  return {
    supported,
    status,
    directoryName,
    chats,
    error,
    chooseDirectory,
    restorePermission,
    createChat,
    updateChat,
    deleteChat,
    migrateLegacyChats,
    sync,
  };
}
