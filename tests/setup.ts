import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

// Node 25+ exposes an incomplete global localStorage unless
// --localstorage-file is supplied. Keep the jsdom test contract portable.
if (!window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
}

beforeEach(() => {
  window.localStorage.clear();
});
