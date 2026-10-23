/**
 * jsdom normally provides localStorage, but Node 22+ defines its own
 * experimental `localStorage` global that is `undefined` unless the runtime is
 * started with `--localstorage-file`. That shadowing leaves zustand's persist
 * middleware without storage. Install a small in-memory Storage instead.
 */
class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.has(key) ? (this.values.get(key) as string) : null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value))
  }
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
}

export {}
