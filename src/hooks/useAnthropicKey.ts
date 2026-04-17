import { useEffect, useState } from "react";

const STORAGE_KEY = "county-recorder:anthropic-api-key";

// Vite injects VITE_-prefixed env vars at build time. For local demos the
// presenter sets this in .env.local; otherwise a prompt in the UI stashes
// their key in localStorage. Prototype-only — production would proxy calls
// server-side so the key never touches the browser.
function envKey(): string | null {
  const v = import.meta.env?.VITE_ANTHROPIC_API_KEY;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function useAnthropicKey() {
  const [key, setKeyState] = useState<string | null>(() => {
    const fromEnv = envKey();
    if (fromEnv) return fromEnv;
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setKeyState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setKey = (next: string | null) => {
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    setKeyState(next);
  };

  const fromEnv = envKey() !== null;
  return { key, setKey, fromEnv };
}
