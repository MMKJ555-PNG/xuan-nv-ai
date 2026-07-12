import { useCallback, useEffect, useRef, useState } from "react";

function resolveInitialValue(initialValue) {
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

function classifyStorageError(error, phase) {
  const quota = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
  return {
    code: quota ? "quota" : phase,
    message: quota ? "浏览器存储空间不足" : error?.message || "浏览器存储操作失败",
  };
}

export default function useLocalStorage(key, initialValue, options = {}) {
  const [initial] = useState(() => {
    const fallback = resolveInitialValue(initialValue);
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return { value: fallback, error: null };
      const parsed = JSON.parse(stored);
      return { value: options.normalize ? options.normalize(parsed) : parsed, error: null };
    } catch (error) {
      console.warn(`[useLocalStorage] 读取 "${key}" 失败，使用默认值：`, error);
      return { value: fallback, error: classifyStorageError(error, "read") };
    }
  });
  const [value, setReactValue] = useState(initial.value);
  const valueRef = useRef(value);
  const initialValueRef = useRef(initialValue);
  const optionsRef = useRef(options);
  const [persistence, setPersistence] = useState({
    status: initial.error ? "error" : "idle",
    error: initial.error,
    fallbackUsed: false,
  });

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const setValue = useCallback((nextValueOrUpdater) => {
    const nextValue = typeof nextValueOrUpdater === "function"
      ? nextValueOrUpdater(valueRef.current)
      : nextValueOrUpdater;

    valueRef.current = nextValue;
    setReactValue(nextValue);

    try {
      localStorage.setItem(key, JSON.stringify(nextValue));
      setPersistence({ status: "saved", error: null, fallbackUsed: false });
    } catch (error) {
      const storageError = classifyStorageError(error, "write");
      if (storageError.code === "quota" && optionsRef.current.onQuotaExceeded) {
        try {
          const fallbackValue = optionsRef.current.onQuotaExceeded(nextValue);
          localStorage.setItem(key, JSON.stringify(fallbackValue));
          setPersistence({ status: "warning", error: storageError, fallbackUsed: true });
          return;
        } catch (fallbackError) {
          setPersistence({
            status: "error",
            error: classifyStorageError(fallbackError, "write"),
            fallbackUsed: false,
          });
          return;
        }
      }
      setPersistence({ status: "error", error: storageError, fallbackUsed: false });
    }
  }, [key]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.storageArea !== localStorage || event.key !== key) return;
      try {
        const fallback = resolveInitialValue(initialValueRef.current);
        const parsed = event.newValue === null ? fallback : JSON.parse(event.newValue);
        const normalized = optionsRef.current.normalize ? optionsRef.current.normalize(parsed) : parsed;
        valueRef.current = normalized;
        setReactValue(normalized);
        setPersistence({ status: "saved", error: null, fallbackUsed: false });
      } catch (error) {
        setPersistence({ status: "error", error: classifyStorageError(error, "parse"), fallbackUsed: false });
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  return [value, setValue, persistence];
}
