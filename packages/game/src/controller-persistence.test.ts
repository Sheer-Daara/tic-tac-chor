import { describe, expect, it, vi } from "vite-plus/test";
import { createInitialSnapshot } from "./contracts";
import type { PersistenceAdapter, PersistedSnapshot } from "./contracts";
import { createGameController } from "./controller";
import { createGameEngine } from "./engine";
import { parseSnapshot, serializeSnapshot } from "./persistence";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function setup(storage: PersistenceAdapter) {
  const controller = createGameController({
    storage,
    random: () => 0,
    scheduler: { schedule: () => () => undefined },
  });
  return { controller, stop: controller.start() };
}

describe("controller persistence", () => {
  it("persists the safe integer boundary and saturates later completed results without save errors", async () => {
    const saved = {
      ...createInitialSnapshot(),
      stats: { wins: 0, losses: 0, draws: Number.MAX_SAFE_INTEGER - 1 },
    };
    let json = serializeSnapshot(saved);
    const storage = {
      load: async () => parseSnapshot(json),
      save: vi.fn(async (value: PersistedSnapshot) => {
        json = serializeSnapshot(value);
      }),
    };
    const rules = createGameEngine();
    const controller = createGameController({
      storage,
      random: () => 0,
      scheduler: { schedule: () => () => undefined },
      engine: {
        ...rules,
        createRound(options) {
          return {
            ...rules.createRound(options),
            board: ["X", "O", "X", "X", "O", "O", "O", "X", null],
          };
        },
      },
    });
    const stop = controller.start();
    await Promise.resolve();
    controller.move(8);
    await controller.whenSaved();
    expect(parseSnapshot(json)?.stats.draws).toBe(Number.MAX_SAFE_INTEGER);
    expect(controller.getSnapshot().game?.outcome.type).toBe("draw");
    controller.newGame();
    controller.move(8);
    controller.move(8);
    await controller.whenSaved();
    expect(controller.getSnapshot().game?.outcome.type).toBe("draw");
    expect(controller.getSnapshot().persisted.stats.draws).toBe(Number.MAX_SAFE_INTEGER);
    expect(controller.getSnapshot().persistenceError).toBeNull();
    expect(parseSnapshot(json)).toEqual(controller.getSnapshot().persisted);
    expect(storage.save).toHaveBeenCalledTimes(3);
    stop();
  });
  it("does not save before hydration and ignores stale load results", async () => {
    const first = deferred<PersistedSnapshot | null>();
    const second = deferred<PersistedSnapshot | null>();
    const storage = {
      load: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
      save: vi.fn(async () => undefined),
    };
    const { controller, stop } = setup(storage);
    controller.setThemePreference("dark");
    controller.resetStats();
    controller.retrySave();
    expect(storage.save).not.toHaveBeenCalled();
    stop();
    const stopAgain = controller.start();
    first.resolve({ ...createInitialSnapshot(), theme: "dark" });
    await first.promise;
    expect(storage.save).not.toHaveBeenCalled();
    second.resolve({ ...createInitialSnapshot(), theme: "light", lastBackgroundIndex: 4 });
    await second.promise;
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledExactlyOnceWith({
      ...createInitialSnapshot(),
      theme: "light",
      lastBackgroundIndex: 0,
    });
    stopAgain();
  });

  it("defensively resets corrupted adapter output and saves a sanitized fresh snapshot", async () => {
    const invalid = {
      version: 1,
      stats: { wins: -2, losses: 0, draws: 0 },
      theme: "dark",
      lastBackgroundIndex: 4,
    };
    const storage = {
      load: vi.fn(async () => invalid as PersistedSnapshot),
      save: vi.fn(async () => undefined),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await controller.whenSaved();
    const expected = { ...createInitialSnapshot(), lastBackgroundIndex: 0 };
    expect(controller.getSnapshot().persisted).toEqual(expected);
    expect(storage.save).toHaveBeenCalledExactlyOnceWith(expected);
    stop();
  });

  it("serializes rapid and reentrant preferences before subscribers can enqueue later writes", async () => {
    const gate = deferred<void>();
    const storage = {
      load: async () => null,
      save: vi
        .fn<PersistenceAdapter["save"]>()
        .mockImplementationOnce(() => gate.promise)
        .mockResolvedValue(undefined),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.save).toHaveBeenCalledOnce();
    let changed = false;
    const unsubscribe = controller.subscribe(() => {
      if (!changed && controller.getSnapshot().persisted.theme === "dark") {
        changed = true;
        controller.setThemePreference("light");
      }
    });
    controller.setThemePreference("dark");
    controller.setThemePreference("system");
    expect(storage.save).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().persisted.theme).toBe("system");
    gate.resolve();
    await controller.whenSaved();
    expect(storage.save.mock.calls.map(([snapshot]) => snapshot.theme)).toEqual([
      "system",
      "dark",
      "light",
      "system",
    ]);
    unsubscribe();
    stop();
  });

  it("ignores unchanged and invalid preferences and never writes ordinary moves", async () => {
    const storage = { load: async () => null, save: vi.fn(async () => undefined) };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await controller.whenSaved();
    const saved = controller.getSnapshot().persisted;
    controller.setThemePreference("system");
    controller.setThemePreference("auto" as "system");
    controller.resetStats();
    controller.move(0);
    await controller.whenSaved();
    expect(controller.getSnapshot().persisted).toBe(saved);
    expect(storage.save).toHaveBeenCalledOnce();
    stop();
    controller.setThemePreference("dark");
    controller.resetStats();
    controller.retrySave();
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledOnce();
  });

  it("continues after rejected writes, retains latest memory state, and clears errors on retry", async () => {
    const error = new Error("quota exhausted");
    const storage = {
      load: async () => null,
      save: vi
        .fn<PersistenceAdapter["save"]>()
        .mockRejectedValueOnce(error)
        .mockResolvedValue(undefined),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await controller.whenSaved();
    expect(controller.getSnapshot().persistenceError).toBe(error);
    controller.move(0);
    expect(controller.getSnapshot().game?.board[0]).toBe("X");
    expect(controller.getSnapshot().persistenceError).toBe(error);
    controller.retrySave();
    await controller.whenSaved();
    expect(controller.getSnapshot().persistenceError).toBeNull();
    expect(storage.save).toHaveBeenCalledTimes(2);
    controller.setThemePreference("dark");
    await controller.whenSaved();
    expect(storage.save).toHaveBeenLastCalledWith({
      ...createInitialSnapshot(),
      lastBackgroundIndex: 0,
      theme: "dark",
    });
    stop();
  });

  it("does not let an old successful write clear an error while a newer preference is pending", async () => {
    const loadError = new Error("read denied");
    const first = deferred<void>();
    const latest = deferred<void>();
    const storage = {
      load: async () => {
        throw loadError;
      },
      save: vi
        .fn<PersistenceAdapter["save"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => latest.promise),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await Promise.resolve();
    controller.retrySave();
    controller.setThemePreference("dark");
    first.resolve();
    await first.promise;
    await Promise.resolve();
    expect(controller.getSnapshot().persisted.theme).toBe("dark");
    expect(controller.getSnapshot().persistenceError).toBe(loadError);
    const saveError = new Error("write denied");
    latest.reject(saveError);
    await controller.whenSaved();
    expect(controller.getSnapshot().persistenceError).toBe(saveError);
    expect(controller.getSnapshot().persisted.theme).toBe("dark");
    stop();
  });

  it("preserves unread storage and the load error until an explicit save is requested", async () => {
    const existing = {
      ...createInitialSnapshot(),
      stats: { wins: 5, losses: 3, draws: 9 },
      theme: "dark" as const,
      lastBackgroundIndex: 4,
    };
    let json = serializeSnapshot(existing);
    const loadError = new Error("temporary read failure");
    const storage = {
      load: async () => {
        throw loadError;
      },
      save: vi.fn(async (saved: PersistedSnapshot) => {
        json = serializeSnapshot(saved);
      }),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await controller.whenSaved();
    expect(controller.getSnapshot().persistenceError).toBe(loadError);
    expect(controller.getSnapshot().canPlayerMove).toBe(true);
    expect(storage.save).not.toHaveBeenCalled();
    expect(parseSnapshot(json)).toEqual(existing);
    controller.move(0);
    await controller.whenSaved();
    expect(controller.getSnapshot().game?.board[0]).toBe("X");
    expect(controller.getSnapshot().persistenceError).toBe(loadError);
    expect(storage.save).not.toHaveBeenCalled();
    expect(parseSnapshot(json)).toEqual(existing);
    controller.retrySave();
    await controller.whenSaved();
    expect(controller.getSnapshot().persistenceError).toBeNull();
    expect(storage.save).toHaveBeenCalledExactlyOnceWith({
      ...createInitialSnapshot(),
      lastBackgroundIndex: 0,
    });
    stop();
  });

  it("retains a failed queued write error until the latest pending write succeeds", async () => {
    const first = deferred<void>();
    const latest = deferred<void>();
    const storage = {
      load: async () => null,
      save: vi
        .fn<PersistenceAdapter["save"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => latest.promise),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await Promise.resolve();
    controller.setThemePreference("light");
    const failure = new Error("temporarily unavailable");
    first.reject(failure);
    await first.promise.catch(() => undefined);
    await Promise.resolve();
    expect(controller.getSnapshot().persistenceError).toBe(failure);
    expect(controller.getSnapshot().persisted.theme).toBe("light");
    latest.resolve();
    await controller.whenSaved();
    expect(controller.getSnapshot().persistenceError).toBeNull();
    stop();
  });

  it("flushes accepted writes after unmount and reloads totals/theme/background into a fresh round", async () => {
    let json: string | null = serializeSnapshot({
      ...createInitialSnapshot(),
      stats: { wins: 2, losses: 3, draws: 4 },
      theme: "dark",
      lastBackgroundIndex: 2,
    });
    const gate = deferred<void>();
    const storage = {
      load: async () => parseSnapshot(json),
      save: vi
        .fn<PersistenceAdapter["save"]>()
        .mockImplementationOnce(async (snapshot) => {
          await gate.promise;
          json = serializeSnapshot(snapshot);
        })
        .mockImplementation(async (snapshot) => {
          json = serializeSnapshot(snapshot);
        }),
    };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await Promise.resolve();
    controller.move(0);
    controller.setThemePreference("light");
    controller.newGame();
    controller.move(1);
    stop();
    gate.resolve();
    await controller.whenSaved();
    expect(parseSnapshot(json)).toEqual({
      ...createInitialSnapshot(),
      stats: { wins: 2, losses: 3, draws: 4 },
      theme: "light",
      lastBackgroundIndex: 4,
    });
    expect(json).not.toContain("board");
    expect(json).not.toContain("Taunt");
    const fresh = setup(storage);
    await Promise.resolve();
    await fresh.controller.whenSaved();
    expect(fresh.controller.getSnapshot()).toMatchObject({
      persisted: {
        theme: "light",
        stats: { wins: 2, losses: 3, draws: 4 },
        lastBackgroundIndex: 0,
      },
      game: {
        backgroundIndex: 0,
        board: [null, null, null, null, null, null, null, null, null],
        outcome: { type: "in-progress" },
      },
    });
    fresh.stop();
  });

  it("persists the sound preference without touching the round or statistics", async () => {
    const saved = {
      ...createInitialSnapshot(),
      stats: { wins: 2, losses: 3, draws: 4 },
      theme: "dark" as const,
      lastBackgroundIndex: 3,
    };
    const storage = { load: async () => saved, save: vi.fn(async () => undefined) };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await controller.whenSaved();
    const game = controller.getSnapshot().game;
    controller.setSoundEnabled(false);
    expect(controller.getSnapshot().game).toBe(game);
    expect(controller.getSnapshot().persisted).toEqual({
      ...saved,
      soundEnabled: false,
      lastBackgroundIndex: 4,
    });
    controller.setSoundEnabled(false);
    controller.setSoundEnabled("yes" as unknown as boolean);
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledTimes(2);
    expect(storage.save).toHaveBeenLastCalledWith(controller.getSnapshot().persisted);
    stop();
  });

  it("resets only statistics and persists zeros without replacing the ongoing round", async () => {
    const saved = {
      ...createInitialSnapshot(),
      stats: { wins: 2, losses: 3, draws: 4 },
      theme: "dark" as const,
      lastBackgroundIndex: 3,
    };
    const storage = { load: async () => saved, save: vi.fn(async () => undefined) };
    const { controller, stop } = setup(storage);
    await Promise.resolve();
    await controller.whenSaved();
    controller.move(0);
    const game = controller.getSnapshot().game;
    controller.resetStats();
    expect(controller.getSnapshot().game).toBe(game);
    expect(controller.getSnapshot().persisted).toEqual({
      ...saved,
      stats: { wins: 0, losses: 0, draws: 0 },
      lastBackgroundIndex: 4,
    });
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledTimes(2);
    expect(storage.save).toHaveBeenLastCalledWith(controller.getSnapshot().persisted);
    expect(saved.stats).toEqual({ wins: 2, losses: 3, draws: 4 });
    stop();
  });
});
