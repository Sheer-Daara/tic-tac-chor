import { describe, expect, it } from "vite-plus/test";
import { createInitialSnapshot, type GameState } from "./contracts";
import type { ControllerSnapshot } from "./controller";
import { createGameEngine } from "./engine";
import { getCellLabel, getTurnLabel } from "./presentation";

const round = createGameEngine().createRound({
  roundId: 7,
  lastBackgroundIndex: null,
  random: () => 0,
});
function ready(game: GameState = round, thinking = false): ControllerSnapshot {
  return {
    status: "ready",
    game,
    persisted: createInitialSnapshot(),
    persistenceError: null,
    isThinking: thinking,
    canPlayerMove: !thinking && game.outcome.type === "in-progress",
  };
}

describe("accessible board descriptions", () => {
  it("uses actors rather than assuming the player is X", () => {
    expect(
      getCellLabel(
        { ...round, playerMark: "O", board: ["X", "O", null, null, null, null, null, null, null] },
        0,
        true,
      ),
    ).toBe("Row 1, column 1: Nurundru Mudi's X.");
    expect(getCellLabel({ ...round, playerMark: "O" }, 8, true)).toBe(
      "Row 3, column 3: empty. Place your O.",
    );
  });
  it("describes locked and winning cells without inviting invalid moves", () => {
    expect(getCellLabel(round, 4, false)).toContain("Waiting for Mudi");
    const terminal: GameState = {
      ...round,
      board: ["X", "X", "X", null, null, null, null, null, null],
      outcome: { type: "win", winner: "player", mark: "X", line: [0, 1, 2] },
      turn: null,
    };
    expect(getCellLabel(terminal, 1, false)).toContain("winning line");
    expect(getCellLabel(terminal, 4, false)).toContain("Round finished");
  });
});

it("exposes loading, thinking, player turn and terminal status", () => {
  expect(
    getTurnLabel({
      status: "loading",
      game: null,
      persisted: createInitialSnapshot(),
      persistenceError: null,
      isThinking: false,
      canPlayerMove: false,
    }),
  ).toContain("Getting the board ready");
  expect(getTurnLabel(ready())).toBe("Your move!");
  expect(getTurnLabel(ready(round, true))).toBe("Mudi is thinking…");
  expect(getTurnLabel(ready({ ...round, outcome: { type: "draw" }, turn: null }))).toBe(
    "It's a draw!",
  );
  expect(
    getTurnLabel(
      ready({
        ...round,
        outcome: { type: "win", winner: "computer", mark: "O", line: [0, 1, 2] },
        turn: null,
      }),
    ),
  ).toBe("Mudi wins this round");
  expect(
    getTurnLabel(
      ready({
        ...round,
        outcome: { type: "win", winner: "player", mark: "X", line: [0, 1, 2] },
        turn: null,
      }),
    ),
  ).toBe("You won this round!");
});
