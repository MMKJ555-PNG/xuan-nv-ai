const DB_NAME = "xuannv-file-storage";
const STORE_NAME = "directory-handles";
const HANDLE_KEY = "chat-directory";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export function isDirectoryStorageSupported() {
  return Boolean(window.isSecureContext && window.showDirectoryPicker && window.indexedDB);
}

export function loadDirectoryHandle() {
  return withStore("readonly", (store) => store.get(HANDLE_KEY));
}

export function saveDirectoryHandle(handle) {
  return withStore("readwrite", (store) => store.put(handle, HANDLE_KEY));
}

export function clearDirectoryHandle() {
  return withStore("readwrite", (store) => store.delete(HANDLE_KEY));
}
