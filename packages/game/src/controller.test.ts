import { describe, expect, it, vi } from "vite-plus/test";
import { createInitialSnapshot } from "./contracts";
import type {
  CreateRoundOptions,
  GameEngine,
  GameState,
  PersistedSnapshot,
  PersistenceAdapter,
} from "./contracts";
import { createGameController } from "./controller";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function setup(load: PersistenceAdapter["load"] = async () => null) {
  const random = vi.fn(() => 0.25);
  const createRound = vi.fn(
    ({ roundId, lastBackgroundIndex, random: source }: CreateRoundOptions): GameState => ({
      roundId,
      board: [null, null, null, null, null, null, null, null, null],
      playerMark: source() < 0.5 ? "X" : "O",
      turn: "player",
      outcome: { type: "in-progress" },
      backgroundIndex: lastBackgroundIndex ?? 0,
      latestTaunt: null,
    }),
  );
  const applyMove = vi.fn<GameEngine["applyMove"]>((state, cell, actor, source) => ({
    ...state,
    latestTaunt: `${actor}:${cell}:${source()}`,
  }));
  const storage = { load: vi.fn(load), save: vi.fn(async () => undefined) };
  const controller = createGameController({
    engine: { createRound, applyMove, chooseComputerMove: () => null },
    storage,
    random,
    scheduler: { schedule: () => () => undefined },
  });
  return { controller, storage, random, createRound, applyMove };
}

describe("game controller foundation", () => {
  it("waits for saved data before creating a round and forwards injected dependencies", async () => {
    const pending = deferred<PersistedSnapshot | null>();
    const { controller, storage, createRound, applyMove, random } = setup(() => pending.promise);
    const saved: PersistedSnapshot = {
      version: 1,
      stats: { wins: 2, losses: 4, draws: 3 },
      theme: "dark",
      soundEnabled: true,
      lastBackgroundIndex: 4,
    };

    expect(storage.load).not.toHaveBeenCalled();
    const cleanup = controller.start();
    controller.move(2, "player");
    controller.newGame();
    expect(controller.getSnapshot().status).toBe("loading");
    expect(createRound).not.toHaveBeenCalled();
    expect(applyMove).not.toHaveBeenCalled();

    pending.resolve(saved);
    await pending.promise;
    const snapshot = controller.getSnapshot();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.persisted).toEqual(saved);
    expect(createRound).toHaveBeenCalledWith({
      roundId: 1,
      lastBackgroundIndex: 4,
      random,
    });
    if (snapshot.status !== "ready") throw new Error("Expected hydrated controller");
    expect(snapshot.game.playerMark).toBe("X");
    controller.move(2, "player");
    expect(applyMove).toHaveBeenCalledWith(snapshot.game, 2, "player", random);
    expect(controller.getSnapshot().game?.latestTaunt).toBe("player:2:0.25");
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledExactlyOnceWith(saved);
    cleanup();
  });

  it("recovers from load failure and exposes the error without blocking the round", async () => {
    const error = new Error("Storage unavailable");
    const { controller, createRound } = setup(async () => {
      throw error;
    });
    const cleanup = controller.start();
    await Promise.resolve();
    expect(controller.getSnapshot()).toMatchObject({
      status: "ready",
      persisted: { ...createInitialSnapshot(), lastBackgroundIndex: 0 },
      persistenceError: error,
    });
    expect(createRound).toHaveBeenCalledOnce();
    cleanup();
  });

  it("uses defaults when there is no saved snapshot", async () => {
    const { controller } = setup();
    const cleanup = controller.start();
    await Promise.resolve();
    expect(controller.getSnapshot()).toMatchObject({
      status: "ready",
      persisted: { ...createInitialSnapshot(), lastBackgroundIndex: 0 },
      persistenceError: null,
    });
    cleanup();
  });

  it("discards obsolete hydration after cleanup and supports a StrictMode-style restart", async () => {
    const first = deferred<PersistedSnapshot | null>();
    const second = deferred<PersistedSnapshot | null>();
    const { controller, storage, createRound } = setup();
    storage.load
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    const stopFirst = controller.start();
    stopFirst();
    stopFirst();
    const stopSecond = controller.start();
    first.resolve({ ...createInitialSnapshot(), theme: "dark" });
    await first.promise;
    expect(createRound).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    second.resolve({ ...createInitialSnapshot(), theme: "light" });
    await second.promise;
    expect(controller.getSnapshot().persisted.theme).toBe("light");
    expect(createRound).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
    stopSecond();
    unsubscribe();
  });

  it("keeps hydration active until the final consumer cleans up", async () => {
    const pending = deferred<PersistedSnapshot | null>();
    const { controller, storage, createRound } = setup(() => pending.promise);
    const stopFirst = controller.start();
    const stopSecond = controller.start();
    stopFirst();
    pending.resolve(null);
    await pending.promise;
    expect(storage.load).toHaveBeenCalledOnce();
    expect(createRound).toHaveBeenCalledOnce();
    stopSecond();
  });

  it("maintains stable snapshots, unsubscribes listeners and blocks inactive actions", async () => {
    const { controller, applyMove, createRound } = setup();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    const stop = controller.start();
    await Promise.resolve();
    const snapshot = controller.getSnapshot();
    expect(controller.getSnapshot()).toBe(snapshot);

    applyMove.mockImplementationOnce((state) => state);
    controller.move(0, "player");
    expect(controller.getSnapshot()).toBe(snapshot);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    controller.newGame();
    expect(controller.getSnapshot().game?.roundId).toBe(2);
    expect(createRound.mock.calls[1]?.[0].lastBackgroundIndex).toBe(snapshot.game?.backgroundIndex);
    expect(listener).toHaveBeenCalledOnce();
    stop();
    controller.move(1, "computer");
    controller.newGame();
    expect(applyMove).toHaveBeenCalledOnce();
    expect(createRound).toHaveBeenCalledTimes(2);

    const stopAgain = controller.start();
    await Promise.resolve();
    expect(controller.getSnapshot().game?.roundId).toBe(2);
    stopAgain();
  });
});
