import { createInitialSnapshot } from "@tic-tac-chor/game";
import { describe, expect, it, vi } from "vite-plus/test";

import { createBrowserPersistenceAdapter, SNAPSHOT_STORAGE_KEY } from "./persistence";

function createStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value);
    }),
  };
}

describe("browser persistence adapter", () => {
  it("defers browser storage access until loading or saving", async () => {
    const storage = createStorage();
    const getStorage = vi.fn(() => storage);
    const adapter = createBrowserPersistenceAdapter({ getStorage });

    expect(getStorage).not.toHaveBeenCalled();
    expect(await adapter.load()).toBeNull();
    expect(getStorage).toHaveBeenCalledOnce();
    expect(storage.getItem).toHaveBeenCalledWith(SNAPSHOT_STORAGE_KEY);
  });

  it("stores one validated JSON snapshot and leaves unrelated values intact", async () => {
    const storage = createStorage();
    storage.items.set("other-app:settings", "untouched");
    const adapter = createBrowserPersistenceAdapter({ getStorage: () => storage });
    const snapshot = {
      ...createInitialSnapshot(),
      stats: { wins: 3, losses: 8, draws: 4 },
      theme: "dark" as const,
      lastBackgroundIndex: 4,
    };

    await adapter.save(snapshot);

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.items.get(SNAPSHOT_STORAGE_KEY)!)).toEqual(snapshot);
    expect(await adapter.load()).toEqual(snapshot);
    expect(storage.items.size).toBe(2);
    expect(storage.items.get("other-app:settings")).toBe("untouched");

    await adapter.save(createInitialSnapshot());
    expect(storage.items.size).toBe(2);
    expect(await adapter.load()).toEqual(createInitialSnapshot());
    expect(storage.items.get("other-app:settings")).toBe("untouched");
  });

  it.each([
    "not JSON",
    "null",
    "[]",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ ...createInitialSnapshot(), theme: "sepia" }),
    JSON.stringify({ ...createInitialSnapshot(), stats: { wins: -1, losses: 0, draws: 0 } }),
  ])("recovers from malformed or unsupported data without changing it: %s", async (json) => {
    const storage = createStorage();
    storage.items.set(SNAPSHOT_STORAGE_KEY, json);
    const adapter = createBrowserPersistenceAdapter({ getStorage: () => storage });

    expect(await adapter.load()).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.items.get(SNAPSHOT_STORAGE_KEY)).toBe(json);
  });

  it("surfaces denied storage access as rejected adapter operations", async () => {
    const error = new Error("Storage is disabled");
    const adapter = createBrowserPersistenceAdapter({
      getStorage() {
        throw error;
      },
    });

    await expect(adapter.load()).rejects.toBe(error);
    await expect(adapter.save(createInitialSnapshot())).rejects.toBe(error);
  });

  it("surfaces read and quota failures without swallowing them", async () => {
    const readError = new Error("Read failed");
    const quotaError = new Error("Quota exceeded");
    const adapter = createBrowserPersistenceAdapter({
      getStorage: () => ({
        getItem() {
          throw readError;
        },
        setItem() {
          throw quotaError;
        },
      }),
    });

    await expect(adapter.load()).rejects.toBe(readError);
    await expect(adapter.save(createInitialSnapshot())).rejects.toBe(quotaError);
  });

  it("rejects invalid snapshots before touching browser storage", async () => {
    const storage = createStorage();
    const getStorage = vi.fn(() => storage);
    const adapter = createBrowserPersistenceAdapter({ getStorage });

    await expect(
      adapter.save({ ...createInitialSnapshot(), stats: { wins: NaN, losses: 0, draws: 0 } }),
    ).rejects.toThrow();
    expect(getStorage).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
