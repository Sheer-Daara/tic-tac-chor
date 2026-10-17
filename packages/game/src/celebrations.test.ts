import { describe, expect, it } from "vite-plus/test";
import type { Board } from "./contracts";
import {
  defaultWinCelebrations,
  getWinCelebrationKind,
  selectWinCelebration,
} from "./celebrations";
import { createGameEngine, isCheatWin, isFairComputerWin } from "./engine";

const engine = createGameEngine();
const random = () => 0;

describe("win celebration copy", () => {
  it("ships the requested default lines", () => {
    expect(defaultWinCelebrations.fairComputerWin).toContain("Aap Pappu ho Kya");
    expect(defaultWinCelebrations.cheatComputerWin).toContain("Ye hain MasterStroke");
  });

  it("picks the animation by cheat flag and ignores player wins and draws", () => {
    expect(
      getWinCelebrationKind({ type: "win", winner: "computer", mark: "O", line: [0, 1, 2] }),
    ).toBe("fair");
    expect(
      getWinCelebrationKind({
        type: "win",
        winner: "computer",
        mark: "O",
        line: [0, 1, 2],
        cheated: true,
      }),
    ).toBe("cheat");
    expect(
      getWinCelebrationKind({ type: "win", winner: "player", mark: "X", line: [0, 1, 2] }),
    ).toBeNull();
    expect(getWinCelebrationKind({ type: "draw" })).toBeNull();
    expect(getWinCelebrationKind({ type: "in-progress" })).toBeNull();
  });

  it("flags cheat overrides from the engine while legal wins stay fair", () => {
    const round = engine.createRound({ roundId: 1, lastBackgroundIndex: null, random });
    const legalBoard: Board = ["O", "O", null, "X", "X", null, null, null, null];
    const legal = engine.applyMove(
      { ...round, board: legalBoard, playerMark: "X", turn: "computer" },
      2,
      "computer",
      random,
    );
    expect(isFairComputerWin(legal.outcome)).toBe(true);
    expect(isCheatWin(legal.outcome)).toBe(false);
    expect(legal.outcome).toMatchObject({ type: "win", winner: "computer" });

    const drawishBoard: Board = ["O", "O", "X", null, "X", "O", null, "O", "X"];
    const drawish = {
      ...round,
      board: drawishBoard,
      playerMark: "X" as const,
      turn: "computer" as const,
    };
    const cheated = engine.applyMove(drawish, 2, "computer", random);
    expect(cheated.outcome).toMatchObject({ type: "win", winner: "computer", cheated: true });
    expect(isCheatWin(cheated.outcome)).toBe(true);
    expect(isFairComputerWin(cheated.outcome)).toBe(false);
    expect(getWinCelebrationKind(cheated.outcome)).toBe("cheat");
    expect(getWinCelebrationKind(legal.outcome)).toBe("fair");
  });

  it("rotates multiple lines round-robin so copy stays editable", () => {
    const config = {
      fairComputerWin: ["First taunt", "Second taunt", "  Third taunt  "],
      cheatComputerWin: ["Only masterstroke"],
    };
    expect(selectWinCelebration(config, "fair", 0)).toBe("First taunt");
    expect(selectWinCelebration(config, "fair", 1)).toBe("Second taunt");
    expect(selectWinCelebration(config, "fair", 2)).toBe("Third taunt");
    expect(selectWinCelebration(config, "fair", 3)).toBe("First taunt");
    expect(selectWinCelebration(config, "fair", 7)).toBe("Second taunt");
    expect(selectWinCelebration(config, "cheat", 5)).toBe("Only masterstroke");
  });

  it("skips blank lines and stays kind-local instead of borrowing copy", () => {
    // An empty fair list must not show cheat copy with the fair animation.
    expect(
      selectWinCelebration(
        { fairComputerWin: ["  ", ""], cheatComputerWin: ["Backup"] },
        "fair",
        0,
      ),
    ).toBe("");
    expect(
      selectWinCelebration({ fairComputerWin: ["Backup"], cheatComputerWin: [] }, "cheat", 0),
    ).toBe("");
    expect(selectWinCelebration({ fairComputerWin: [], cheatComputerWin: [] }, "fair", 0)).toBe("");
  });
});
