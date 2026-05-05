import { useState, useEffect } from "react";

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initialValue;
      return JSON.parse(stored);
    } catch (e) {
      console.warn(`[useLocalStorage] 读取 "${key}" 失败，使用默认值：`, e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[useLocalStorage] 写入 "${key}" 失败：`, e);
    }
  }, [key, value]);

  return [value, setValue];
}
