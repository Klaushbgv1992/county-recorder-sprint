// jsdom 29 in this vitest setup ships a localStorage object with no
// methods; polyfill it here so any component depending on localStorage
// can render in tests without each suite needing its own polyfill.
// (sessionStorage mirrors localStorage in the browser — polyfill both.)

function makeStoragePolyfill(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

function installStorage(name: "localStorage" | "sessionStorage") {
  const existing = (globalThis as unknown as Record<string, Storage>)[name];
  if (existing && typeof existing.getItem === "function") return;
  const polyfill = makeStoragePolyfill();
  Object.defineProperty(window, name, {
    value: polyfill,
    configurable: true,
  });
  Object.defineProperty(globalThis, name, {
    value: polyfill,
    configurable: true,
  });
}

installStorage("localStorage");
installStorage("sessionStorage");
