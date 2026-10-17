import { describe, expect, it, vi } from "vite-plus/test";
import { createInitialSnapshot } from "./contracts";
import type { CellIndex, GameEngine, GameState, PersistedSnapshot, Scheduler } from "./contracts";
import { COMPUTER_THINKING_MS, createGameController } from "./controller";
import { createGameEngine, getActorMark } from "./engine";

interface ScheduledJob {
  readonly callback: () => void;
  readonly delayMs: number;
  readonly dueAt: number;
  readonly cancel: () => void;
  canceled: boolean;
  fired: boolean;
}

async function setup(
  options: { opener?: number; game?: GameState; saved?: PersistedSnapshot } = {},
) {
  let now = 0;
  const jobs: ScheduledJob[] = [];
  const scheduler: Scheduler = {
    schedule(callback, delayMs) {
      const job: ScheduledJob = {
        callback,
        delayMs,
        dueAt: now + delayMs,
        canceled: false,
        fired: false,
        cancel: vi.fn(() => {
          job.canceled = true;
        }),
      };
      jobs.push(job);
      return job.cancel;
    },
  };
  const engine: GameEngine = createGameEngine();
  if (options.game) {
    const game = options.game;
    engine.createRound = ({ roundId }) => ({ ...game, roundId });
  }
  const random = vi.fn(() => 0).mockReturnValueOnce(options.opener ?? 0);
  const storage = {
    load: vi.fn(async () => options.saved ?? null),
    save: vi.fn(async () => undefined),
  };
  const sound = { playMove: vi.fn() };
  const controller = createGameController({
    engine: options.game ? engine : undefined,
    storage,
    random,
    scheduler,
    sound,
  });
  const stop = controller.start();
  await Promise.resolve();

  function advanceTime(milliseconds: number): void {
    now += milliseconds;
    for (const job of jobs) {
      if (!job.canceled && !job.fired && job.dueAt <= now) {
        job.fired = true;
        job.callback();
      }
    }
  }

  return { controller, random, storage, jobs, stop, advanceTime, sound };
}

function gameState(overrides: Partial<GameState>): GameState {
  return {
    roundId: 1,
    board: [null, null, null, null, null, null, null, null, null],
    playerMark: "X",
    turn: "player",
    outcome: { type: "in-progress" },
    backgroundIndex: 4,
    latestTaunt: null,
    ...overrides,
  };
}

describe("gameplay controller", () => {
  it("exposes correct marks and accepts input when the human opens", async () => {
    const { controller, jobs, stop } = await setup();
    const { game, isThinking, canPlayerMove } = controller.getSnapshot();
    expect(game?.board.every((cell) => cell === null)).toBe(true);
    expect(game?.turn).toBe("player");
    expect(game?.playerMark).toBe("X");
    if (!game) throw new Error("Expected a ready round");
    expect(getActorMark(game, "computer")).toBe("O");
    expect(isThinking).toBe(false);
    expect(canPlayerMove).toBe(true);
    expect(jobs).toHaveLength(0);
    stop();
  });

  it("delays a computer opening for 1.2 seconds and blocks manual computer actions", async () => {
    const { controller, jobs, advanceTime, stop } = await setup({ opener: 0.9 });
    const opening = controller.getSnapshot();
    expect(opening).toMatchObject({
      status: "ready",
      isThinking: true,
      canPlayerMove: false,
      game: { playerMark: "O", turn: "computer" },
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.delayMs).toBe(COMPUTER_THINKING_MS);
    controller.move(0);
    controller.move(0, "computer");
    expect(controller.getSnapshot()).toBe(opening);
    advanceTime(1_199);
    expect(controller.getSnapshot()).toBe(opening);
    advanceTime(1);
    expect(controller.getSnapshot()).toMatchObject({
      isThinking: false,
      canPlayerMove: true,
      game: { turn: "player" },
    });
    expect(controller.getSnapshot().game?.board.filter((cell) => cell === "X")).toHaveLength(1);
    expect(controller.getSnapshot().game?.board.filter((cell) => cell === "O")).toHaveLength(0);
    stop();
  });

  it("publishes thinking atomically and rejects rapid taps before the computer replies", async () => {
    const { controller, jobs, advanceTime, stop } = await setup();
    let attemptedReentrantMove = false;
    const unsubscribe = controller.subscribe(() => {
      if (controller.getSnapshot().isThinking && !attemptedReentrantMove) {
        attemptedReentrantMove = true;
        expect(controller.getSnapshot().canPlayerMove).toBe(false);
        controller.move(1);
      }
    });
    controller.move(0);
    const thinking = controller.getSnapshot();
    controller.move(0);
    controller.move(2);
    controller.move(2, "computer");
    expect(controller.getSnapshot()).toBe(thinking);
    expect(thinking.game?.board.filter((cell) => cell !== null)).toHaveLength(1);
    expect(jobs).toHaveLength(1);
    advanceTime(1_200);
    const afterComputer = controller.getSnapshot();
    expect(afterComputer.game?.board.filter((cell) => cell !== null)).toHaveLength(2);
    jobs[0]?.callback();
    expect(controller.getSnapshot()).toBe(afterComputer);
    unsubscribe();
    stop();
  });

  it("plays a distinct cue for the human move and then the computer reply", async () => {
    const { controller, sound, advanceTime, stop } = await setup();
    expect(sound.playMove).not.toHaveBeenCalled();
    controller.move(4);
    expect(sound.playMove).toHaveBeenCalledTimes(1);
    expect(sound.playMove).toHaveBeenLastCalledWith("player");
    advanceTime(1_200);
    expect(sound.playMove).toHaveBeenCalledTimes(2);
    expect(sound.playMove).toHaveBeenLastCalledWith("computer");
    // Rejected/duplicate input must not add cues.
    controller.move(4);
    controller.move(4, "computer");
    expect(sound.playMove).toHaveBeenCalledTimes(2);
    stop();
  });

  it("keeps cues silent while sound is off and resumes when re-enabled", async () => {
    const saved: PersistedSnapshot = { ...createInitialSnapshot(), soundEnabled: false };
    const { controller, sound, advanceTime, stop } = await setup({ opener: 0.9, saved });
    advanceTime(1_200);
    expect(sound.playMove).not.toHaveBeenCalled();
    expect(controller.getSnapshot().game?.turn).toBe("player");
    controller.move(4);
    expect(sound.playMove).not.toHaveBeenCalled();
    controller.setSoundEnabled(true);
    advanceTime(1_200);
    expect(sound.playMove).toHaveBeenCalledTimes(1);
    expect(sound.playMove).toHaveBeenLastCalledWith("computer");
    controller.setSoundEnabled(false);
    const board = controller.getSnapshot().game?.board ?? [];
    const empty = board.findIndex((cell) => cell === null) as CellIndex;
    controller.move(empty);
    expect(sound.playMove).toHaveBeenCalledTimes(1);
    stop();
  });

  it("ignores occupied/out-of-range input without publishing or scheduling another turn", async () => {
    const { controller, jobs, advanceTime, stop } = await setup();
    controller.move(0);
    advanceTime(1_200);
    const ready = controller.getSnapshot();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.move(0);
    for (const invalidCell of [-1, 9, 0.5, Number.NaN]) {
      controller.move(invalidCell as CellIndex);
    }
    expect(controller.getSnapshot()).toBe(ready);
    expect(listener).not.toHaveBeenCalled();
    expect(jobs).toHaveLength(1);
    unsubscribe();
    stop();
  });

  it("cancels obsolete turns on New Game even if a canceled callback still runs", async () => {
    const { controller, random, jobs, stop } = await setup();
    controller.move(0);
    const oldGame = controller.getSnapshot().game;
    random.mockReturnValueOnce(0.9);
    controller.newGame();
    const nextRound = controller.getSnapshot();
    expect(nextRound.game?.roundId).toBe((oldGame?.roundId ?? 0) + 1);
    expect(nextRound.game?.board.every((cell) => cell === null)).toBe(true);
    expect(nextRound.game?.playerMark).toBe("O");
    expect(nextRound.isThinking).toBe(true);
    expect(nextRound.persisted.stats).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.cancel).toHaveBeenCalledOnce();
    jobs[0]?.callback();
    expect(controller.getSnapshot()).toBe(nextRound);
    jobs[1]?.callback();
    expect(controller.getSnapshot().game?.board.filter((cell) => cell !== null)).toHaveLength(1);
    stop();
  });

  it("keeps one timer for multiple consumers, cancels on final cleanup and safely resumes", async () => {
    const { controller, jobs, storage, advanceTime, stop } = await setup({ opener: 0.9 });
    const stopSecond = controller.start();
    expect(jobs).toHaveLength(1);
    stop();
    expect(jobs[0]?.cancel).not.toHaveBeenCalled();
    stopSecond();
    stopSecond();
    expect(jobs[0]?.cancel).toHaveBeenCalledOnce();
    const inactive = controller.getSnapshot();
    expect(inactive.isThinking).toBe(false);
    expect(inactive.canPlayerMove).toBe(false);
    jobs[0]?.callback();
    controller.move(0);
    controller.newGame();
    expect(controller.getSnapshot()).toBe(inactive);

    const stopAgain = controller.start();
    expect(jobs).toHaveLength(2);
    expect(storage.load).toHaveBeenCalledOnce();
    jobs[0]?.callback();
    expect(controller.getSnapshot().game?.board.every((cell) => cell === null)).toBe(true);
    advanceTime(1_199);
    expect(controller.getSnapshot().game?.board.every((cell) => cell === null)).toBe(true);
    advanceTime(1);
    expect(controller.getSnapshot().game?.board.filter((cell) => cell !== null)).toHaveLength(1);
    stopAgain();
  });

  it.each([
    {
      result: "player win",
      game: gameState({ board: ["X", "X", null, "O", "O", null, null, null, null] }),
      cell: 2 as CellIndex,
      increment: "wins" as const,
    },
    {
      result: "draw",
      game: gameState({ board: ["X", "O", "X", "X", "O", "O", "O", "X", null] }),
      cell: 8 as CellIndex,
      increment: "draws" as const,
    },
    {
      result: "computer win",
      game: gameState({
        board: ["O", "O", null, "X", "X", null, "X", null, null],
        turn: "computer",
      }),
      cell: null,
      increment: "losses" as const,
    },
  ])("counts a $result once and atomically publishes the terminal state", async (testCase) => {
    const saved: PersistedSnapshot = {
      ...createInitialSnapshot(),
      stats: Object.freeze({ wins: 2, losses: 4, draws: 3 }),
      theme: "dark",
      lastBackgroundIndex: 4,
    };
    const { controller, jobs, advanceTime, storage, stop } = await setup({
      game: testCase.game,
      saved,
    });
    const expectedStats = {
      ...saved.stats,
      [testCase.increment]: saved.stats[testCase.increment] + 1,
    };
    const listener = vi.fn(() => {
      const snapshot = controller.getSnapshot();
      expect(snapshot.game?.outcome.type).not.toBe("in-progress");
      expect(snapshot.persisted.stats).toEqual(expectedStats);
      expect(snapshot.isThinking).toBe(false);
      expect(snapshot.canPlayerMove).toBe(false);
    });
    const unsubscribe = controller.subscribe(listener);
    if (testCase.cell === null) advanceTime(1_200);
    else controller.move(testCase.cell);
    const terminal = controller.getSnapshot();
    expect(terminal.game?.turn).toBe(null);
    expect(terminal.persisted).toEqual({ ...saved, stats: expectedStats });
    expect(saved.stats).toEqual({ wins: 2, losses: 4, draws: 3 });
    controller.move(8);
    controller.move(8, "computer");
    jobs[0]?.callback();
    expect(controller.getSnapshot()).toBe(terminal);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledTimes(2);
    expect(storage.save).toHaveBeenLastCalledWith({ ...saved, stats: expectedStats });
    controller.newGame();
    expect(controller.getSnapshot().persisted.stats).toEqual(expectedStats);
    stop();
  });

  it("abandons incomplete rounds without counting results", async () => {
    const { controller, jobs, stop } = await setup();
    const originalStats = controller.getSnapshot().persisted.stats;
    controller.move(0);
    controller.newGame();
    const nextRound = controller.getSnapshot();
    jobs[0]?.callback();
    expect(controller.getSnapshot()).toBe(nextRound);
    expect(nextRound.persisted.stats).toBe(originalStats);
    expect(nextRound.game?.board.every((cell) => cell === null)).toBe(true);
    stop();
  });
});
