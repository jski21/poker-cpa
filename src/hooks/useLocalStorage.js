import { useCallback, useEffect, useState } from 'react';

// Persist a piece of state to localStorage. Mirrors the useState API.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        return typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      return JSON.parse(raw);
    } catch {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — fail quietly, app still works in-memory.
    }
  }, [key, value]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValue(typeof initialValue === 'function' ? initialValue() : initialValue);
  }, [key, initialValue]);

  return [value, setValue, reset];
}
