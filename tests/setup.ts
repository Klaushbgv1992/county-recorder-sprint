import "@testing-library/jest-dom/vitest";

// jsdom ≤ 26 ships a Blob that wraps Node's Blob but does not re-export the
// WHATWG Blob level-2 methods (arrayBuffer, text, stream).  Polyfill
// arrayBuffer() using FileReader, which IS available in jsdom, so that PDF
// tests can decode the jsPDF output blob without requiring jsdom@29.
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}

// jsdom ships a localStorage object with no methods; polyfill it here so any
// component depending on localStorage can render in tests without each suite
// needing its own polyfill.  (sessionStorage mirrors localStorage.)

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
  // Guard for future environment: "node" test suites where window is absent.
  if (typeof window === "undefined") return;
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

// jsdom does not implement window.matchMedia. Components that branch on
// viewport width (MapLegend, CountyMap's useViewport hook) call it at mount
// time; without this polyfill any render of LandingPage/CountyMap throws
// "window.matchMedia is not a function". Returns a non-matching media query
// list so tests default to the desktop branch — viewport-specific behavior
// is covered by dedicated DOM tests that override matchMedia per-suite.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement ResizeObserver; provide a no-op stub so components
// that observe container size (e.g. SwimlaneDiagram) can mount in unit tests.
if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    value: ResizeObserverStub,
    configurable: true,
    writable: true,
  });
  (globalThis as unknown as Record<string, unknown>).ResizeObserver =
    ResizeObserverStub;
}
