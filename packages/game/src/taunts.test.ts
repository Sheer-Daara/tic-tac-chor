import { describe, expect, it, vi } from "vite-plus/test";
import type { GameState, TauntCategory, TauntConfig } from "./contracts";
import { createGameController } from "./controller";
import { createGameEngine, getNextBackgroundIndex } from "./engine";
import { getMoveTauntCategory, sampleTaunts, selectTaunt } from "./taunts";

const categories: readonly TauntCategory[] = [
  "opening",
  "player-move",
  "computer-move",
  "computer-win",
  "draw",
];
const copy: TauntConfig = {
  opening: ["opening A", "opening B"],
  "player-move": ["player A", "player B"],
  "computer-move": ["computer A", "computer B"],
  "computer-win": ["win A", "win B"],
  draw: ["draw A", "draw B"],
  fallback: "fallback",
};
const random = () => 0;

describe("editable taunts", () => {
  it.each(categories)("selects sample copy from the %s category", (category) => {
    if (category === "computer-win") {
      expect(sampleTaunts[category]).toContain("Mitron, this is masterstroke");
      expect(sampleTaunts[category].length).toBeGreaterThanOrEqual(3);
    } else {
      expect(sampleTaunts[category]).toHaveLength(3);
    }
    expect(sampleTaunts[category]).toContain(selectTaunt(sampleTaunts, category, null, random));
    expect(selectTaunt(copy, category, null, () => 0.999999)).toBe(copy[category][1]);
  });

  it("excludes the previous displayed line across categories and ignores duplicate/blank copy", () => {
    const config: TauntConfig = {
      ...copy,
      "computer-move": [" repeat ", "", "repeat", "next", "next"],
    };
    expect(selectTaunt(config, "computer-move", "repeat", random)).toBe("next");
    expect(selectTaunt(config, "computer-move", null, () => 0.999999)).toBe("next");
  });

  it("uses the editable fallback for an empty category or exhausted singleton", () => {
    const config: TauntConfig = { ...copy, opening: ["", "   "], draw: ["draw A"] };
    const source = vi.fn(random);
    expect(selectTaunt(config, "opening", null, source)).toBe("fallback");
    expect(selectTaunt(config, "draw", "draw A", source)).toBe("fallback");
    expect(selectTaunt(config, null, null, source)).toBe("fallback");
    expect(source).not.toHaveBeenCalled();
  });

  it("remains nonempty and avoids repeats even if all editable copy is blank or repeated", () => {
    const config: TauntConfig = { ...copy, opening: [], fallback: "" };
    const first = selectTaunt(config, "opening", null, random);
    const second = selectTaunt(config, "opening", first, random);
    expect(first.trim().length).toBeGreaterThan(0);
    expect(second.trim().length).toBeGreaterThan(0);
    expect(second).not.toBe(first);
    expect(selectTaunt({ ...config, fallback: first }, "opening", first, random)).not.toBe(first);
  });

  it("uses outcome categories before ordinary move categories", () => {
    expect(getMoveTauntCategory({ type: "in-progress" }, "player")).toBe("player-move");
    expect(getMoveTauntCategory({ type: "in-progress" }, "computer")).toBe("computer-move");
    for (const actor of ["player", "computer"] as const) {
      expect(getMoveTauntCategory({ type: "draw" }, actor)).toBe("draw");
      expect(
        getMoveTauntCategory(
          { type: "win", winner: "computer", mark: "O", line: [0, 1, 2] },
          actor,
        ),
      ).toBe("computer-win");
      // A human win can only arise from a custom engine or injected fixture; there is no authored category.
      expect(
        getMoveTauntCategory({ type: "win", winner: "player", mark: "X", line: [0, 1, 2] }, actor),
      ).toBeNull();
    }
  });

  it("replaces the latest message after each valid move and preserves it on rejected moves", () => {
    const engine = createGameEngine({ taunts: copy });
    const opening = engine.createRound({ roundId: 1, lastBackgroundIndex: null, random });
    expect(opening.latestTaunt).toBe("opening A");
    const player = engine.applyMove(opening, 0, "player", random);
    expect(player.latestTaunt).toBe("player A");
    const computer = engine.applyMove(player, 4, "computer", random);
    expect(computer.latestTaunt).toBe("computer A");
    const rejectedSource = vi.fn(random);
    expect(engine.applyMove(computer, 0, "player", rejectedSource)).toBe(computer);
    expect(rejectedSource).not.toHaveBeenCalled();
    expect(Object.keys(computer)).not.toContain("tauntHistory");
    const next = engine.createRound({
      roundId: 2,
      lastBackgroundIndex: 0,
      previousTaunt: opening.latestTaunt,
      random,
    });
    expect(next.latestTaunt).toBe("opening B");
    expect(opening.latestTaunt).toBe("opening A");
  });

  it("replaces an ordinary move message with a computer-win or draw message", () => {
    const engine = createGameEngine({ taunts: copy });
    const opening = engine.createRound({ roundId: 1, lastBackgroundIndex: null, random });
    const computerWin: GameState = {
      ...opening,
      board: ["O", "O", null, "X", "X", null, "X", null, null],
      turn: "computer",
      latestTaunt: "player A",
    };
    expect(engine.applyMove(computerWin, 2, "computer", random).latestTaunt).toBe("win A");
    const draw: GameState = {
      ...opening,
      board: ["X", "O", "X", "X", "O", "O", "O", "X", null],
      latestTaunt: "computer A",
    };
    expect(engine.applyMove(draw, 8, "player", random).latestTaunt).toBe("draw A");
  });
});

describe("ordered background progression", () => {
  it("starts at zero, advances through five images, wraps, and ignores invalid saved positions", () => {
    const positions: number[] = [];
    let previous: number | null = null;
    for (let round = 0; round < 14; round += 1) {
      previous = getNextBackgroundIndex(previous);
      positions.push(previous);
    }
    expect(positions).toEqual([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3]);
    for (const invalid of [-1, 5, 6, 99, 0.5, NaN, Infinity])
      expect(getNextBackgroundIndex(invalid)).toBe(0);
  });

  it("keeps the background stationary throughout a round", () => {
    const engine = createGameEngine();
    let state = engine.createRound({ roundId: 1, lastBackgroundIndex: 3, random });
    for (const cell of [0, 4, 1, 3, 2] as const) {
      state = engine.applyMove(state, cell, state.turn!, random);
      expect(state.backgroundIndex).toBe(4);
    }
    expect(state.outcome.type).toBe("win");
  });

  it("hydrates the saved position, advances only on New Game, and tracks it in memory", async () => {
    const saved = {
      version: 1 as const,
      stats: { wins: 2, losses: 3, draws: 4 },
      theme: "dark" as const,
      soundEnabled: true,
      lastBackgroundIndex: 3,
    };
    const storage = { load: async () => saved, save: vi.fn(async () => undefined) };
    const controller = createGameController({
      storage,
      random,
      scheduler: { schedule: () => () => undefined },
    });
    const stop = controller.start();
    await Promise.resolve();
    expect(controller.getSnapshot().game?.backgroundIndex).toBe(4);
    expect(controller.getSnapshot().persisted.lastBackgroundIndex).toBe(4);
    expect(saved.lastBackgroundIndex).toBe(3);
    controller.move(0);
    expect(controller.getSnapshot().persisted.lastBackgroundIndex).toBe(4);
    controller.newGame();
    expect(controller.getSnapshot().game?.backgroundIndex).toBe(0);
    expect(controller.getSnapshot().persisted.lastBackgroundIndex).toBe(0);
    expect(controller.getSnapshot().persisted.stats).toEqual(saved.stats);
    expect(controller.getSnapshot().persisted.theme).toBe("dark");
    const openingTaunt = controller.getSnapshot().game?.latestTaunt;
    controller.newGame();
    expect(controller.getSnapshot().game?.backgroundIndex).toBe(1);
    expect(controller.getSnapshot().game?.latestTaunt).not.toBe(openingTaunt);
    const stopSecond = controller.start();
    stop();
    stopSecond();
    const restart = controller.start();
    expect(controller.getSnapshot().game?.backgroundIndex).toBe(1);
    await controller.whenSaved();
    expect(storage.save).toHaveBeenCalledTimes(3);
    expect(storage.save).toHaveBeenLastCalledWith({ ...saved, lastBackgroundIndex: 1 });
    restart();
  });
});
