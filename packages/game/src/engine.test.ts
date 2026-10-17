import { describe, expect, it, vi } from "vite-plus/test";
import type { Actor, Board, CellIndex, GameState, Mark } from "./contracts";
import {
  CHEAT_WIN_PROBABILITY,
  CHEAT_WIN_TAUNT,
  createGameEngine,
  getActorMark,
  getAvailableCells,
  getBoardOutcome,
  getCheatComputerMoves,
  getOptimalComputerMoves,
  isDrawishComputerPosition,
} from "./engine";

const engine = createGameEngine();
const random = () => 0;

function board(text: string): Board {
  if (!/^[XO.]{9}$/.test(text))
    throw new Error("A board fixture must contain nine X/O/empty cells");
  return [...text].map((cell) =>
    cell === "." ? null : cell === "X" ? "X" : "O",
  ) as unknown as Board;
}

function position(text: string, playerMark: Mark = "X", turn: Actor = "computer"): GameState {
  return {
    ...engine.createRound({ roundId: 1, lastBackgroundIndex: null, random }),
    board: board(text),
    playerMark,
    turn,
  };
}

/** Independent oracle: derive rows/columns by coordinates instead of using engine lines. */
function oracleOutcome(cells: Board): Mark | "draw" | null {
  for (const mark of ["X", "O"] as const) {
    for (let coordinate = 0; coordinate < 3; coordinate += 1) {
      if ([0, 1, 2].every((column) => cells[coordinate * 3 + column] === mark)) return mark;
      if ([0, 1, 2].every((row) => cells[row * 3 + coordinate] === mark)) return mark;
    }
    if ([0, 1, 2].every((coordinate) => cells[coordinate * 4] === mark)) return mark;
    if ([0, 1, 2].every((coordinate) => cells[2 + coordinate * 2] === mark)) return mark;
  }
  return cells.some((cell) => cell === null) ? null : "draw";
}

function oracleAvailable(cells: Board): CellIndex[] {
  return Array.from({ length: 9 }, (_, index) => index as CellIndex).filter(
    (index) => cells[index] === null,
  );
}

function oracleMove(cells: Board, cell: CellIndex, mark: Mark): Board {
  return cells.map((value, index) => (index === cell ? mark : value)) as unknown as Board;
}

const oracleScores = new Map<string, number>();
function oracleScore(cells: Board, turn: Mark, computerMark: Mark): number {
  const result = oracleOutcome(cells);
  if (result !== null) return result === "draw" ? 0 : result === computerMark ? 1 : -1;
  const key = `${cells.join("_")}:${turn}:${computerMark}`;
  const cached = oracleScores.get(key);
  if (cached !== undefined) return cached;
  const scores = oracleAvailable(cells).map((cell) =>
    oracleScore(oracleMove(cells, cell, turn), turn === "X" ? "O" : "X", computerMark),
  );
  const score = turn === computerMark ? Math.max(...scores) : Math.min(...scores);
  oracleScores.set(key, score);
  return score;
}

function assertOutcome(state: GameState) {
  const result = oracleOutcome(state.board);
  if (result === null) {
    expect(state.outcome.type).toBe("in-progress");
    expect(state.turn).not.toBeNull();
  } else if (result === "draw") {
    expect(state.outcome.type).toBe("draw");
    expect(state.turn).toBeNull();
  } else {
    expect(state.outcome).toMatchObject({
      type: "win",
      mark: result,
      winner: result === state.playerMark ? "player" : "computer",
    });
    expect(state.turn).toBeNull();
  }
}

describe("game rules", () => {
  it.each([0, 0.499999, 0.5, 0.999999])("assigns X to the opener at random value %s", (value) => {
    const source = vi.fn(() => value);
    const state = engine.createRound({ roundId: 12, lastBackgroundIndex: 4, random: source });
    expect(state).toMatchObject({
      roundId: 12,
      backgroundIndex: 0,
      playerMark: value < 0.5 ? "X" : "O",
      turn: value < 0.5 ? "player" : "computer",
      outcome: { type: "in-progress" },
    });
    expect(state.board).toEqual(Array(9).fill(null));
    expect(getActorMark(state, state.turn!)).toBe("X");
    expect(state.latestTaunt).toEqual(expect.any(String));
    expect(source).toHaveBeenCalledTimes(2);
    expect(
      engine.createRound({ roundId: 1, lastBackgroundIndex: null, random }).backgroundIndex,
    ).toBe(0);
  });

  it.each(["X", "O"] as const)(
    "applies immutable moves and alternates actors when the player is %s",
    (playerMark) => {
      const state = engine.createRound({
        roundId: 1,
        lastBackgroundIndex: null,
        random: () => (playerMark === "X" ? 0 : 0.5),
      });
      Object.freeze(state.board);
      Object.freeze(state);
      const firstActor = state.turn!;
      const secondActor = firstActor === "player" ? "computer" : "player";
      const first = engine.applyMove(state, 4, firstActor, random);
      expect(first.board).not.toBe(state.board);
      expect(state.board[4]).toBeNull();
      expect(first.board[4]).toBe("X");
      expect(first.turn).toBe(secondActor);
      const second = engine.applyMove(first, 0, secondActor, random);
      expect(second.board[0]).toBe("O");
      expect(second.turn).toBe(firstActor);
      expect(getAvailableCells(second.board)).toEqual([1, 2, 3, 5, 6, 7, 8]);
    },
  );

  it.each(["X", "O"] as const)(
    "recognizes all eight winning lines for mark %s and either actor",
    (mark) => {
      const lines: readonly (readonly CellIndex[])[] = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ];
      for (const line of lines) {
        const cells = board(".........");
        const winningBoard = cells.map((cell, index) =>
          line.includes(index as CellIndex) ? mark : cell,
        ) as unknown as Board;
        for (const playerMark of ["X", "O"] as const) {
          expect(getBoardOutcome(winningBoard, playerMark)).toEqual({
            type: "win",
            mark,
            winner: mark === playerMark ? "player" : "computer",
            line,
          });
        }
      }
    },
  );

  it("distinguishes a ninth-cell win from a draw and locks both terminal boards", () => {
    const win = engine.applyMove(position("XOXOXOOX.", "X", "player"), 8, "player", random);
    const draw = engine.applyMove(position("XOXXOOOX.", "X", "player"), 8, "player", random);
    expect(win.outcome).toMatchObject({ type: "win", winner: "player", line: [0, 4, 8] });
    expect(draw.outcome).toEqual({ type: "draw" });
    for (const state of [win, draw]) {
      expect(state.turn).toBeNull();
      expect(engine.applyMove(state, 0, "player", random)).toBe(state);
      expect(engine.applyMove(state, 8, "computer", random)).toBe(state);
      expect(getOptimalComputerMoves(state)).toEqual([]);
    }
  });

  it("rejects invalid indices, occupied cells, wrong actors and inconsistent terminal positions", () => {
    const initial = engine.createRound({ roundId: 1, lastBackgroundIndex: null, random });
    for (const cell of [-1, 9, 0.5, NaN, Infinity]) {
      expect(engine.applyMove(initial, cell as CellIndex, "player", random)).toBe(initial);
    }
    expect(engine.applyMove(initial, 0, "computer", random)).toBe(initial);
    const occupied = engine.applyMove(initial, 0, "player", random);
    expect(engine.applyMove(occupied, 0, "computer", random)).toBe(occupied);
    const terminal = position("XXXOO....", "X", "computer");
    expect(engine.applyMove(terminal, 5, "computer", random)).toBe(terminal);
    const declaredTerminal = { ...initial, outcome: { type: "draw" as const } };
    expect(engine.applyMove(declaredTerminal, 0, "player", random)).toBe(declaredTerminal);
  });
});

describe("minimax opponent", () => {
  it("includes immediate wins, blocks forced losses and prevents the opposite-corner fork", () => {
    expect(getOptimalComputerMoves(position("XX.OO.X..", "O"))).toContain(2);
    expect(getOptimalComputerMoves(position("XX..O...."))).toEqual([2]);
    expect(getOptimalComputerMoves(position("X...O...X"))).toEqual([1, 3, 5, 7]);
  });

  it("selects every equally optimal move through the injected random source", () => {
    const initial = engine.createRound({
      roundId: 1,
      lastBackgroundIndex: null,
      random: () => 0.5,
    });
    const optimal = getOptimalComputerMoves(initial);
    expect(optimal).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    optimal.forEach((cell, index) => {
      expect(engine.chooseComputerMove(initial, () => (index + 0.5) / optimal.length)).toBe(cell);
    });
    expect(engine.chooseComputerMove(initial, () => 0)).toBe(0);
    expect(engine.chooseComputerMove(initial, () => 0.999999)).toBe(8);
    const source = vi.fn(random);
    expect(engine.chooseComputerMove({ ...initial, turn: "player" }, source)).toBeNull();
    expect(
      engine.chooseComputerMove({ ...initial, outcome: { type: "draw" }, turn: null }, source),
    ).toBeNull();
    expect(source).not.toHaveBeenCalled();
  });

  it.each(["X", "O"] as const)(
    "matches an independent minimax oracle on every reachable position with player %s",
    (playerMark) => {
      const seen = new Set<string>();
      let comparisons = 0;
      function visit(state: GameState) {
        const key = state.board.map((cell) => cell ?? "-").join("");
        if (seen.has(key)) return;
        seen.add(key);
        assertOutcome(state);
        if (oracleOutcome(state.board) !== null) return;
        if (state.turn === "computer") {
          const computerMark = playerMark === "X" ? "O" : "X";
          const candidates = oracleAvailable(state.board).map((cell) => ({
            cell,
            score: oracleScore(
              oracleMove(state.board, cell, computerMark),
              playerMark,
              computerMark,
            ),
          }));
          const best = Math.max(...candidates.map(({ score }) => score));
          expect(getOptimalComputerMoves(state)).toEqual(
            candidates.filter(({ score }) => score === best).map(({ cell }) => cell),
          );
          comparisons += 1;
        }
        for (const cell of oracleAvailable(state.board))
          visit(engine.applyMove(state, cell, state.turn!, random));
      }
      visit(
        engine.createRound({
          roundId: 1,
          lastBackgroundIndex: null,
          random: () => (playerMark === "X" ? 0 : 0.5),
        }),
      );
      expect(seen.size).toBe(5478);
      expect(comparisons).toBeGreaterThan(2000);
    },
  );

  it.each(["X", "O"] as const)(
    "cannot lose through any human move or optimal tie choice with player %s",
    (playerMark) => {
      const seen = new Set<string>();
      const endings = new Set<string>();
      function visit(state: GameState) {
        const key = state.board.map((cell) => cell ?? "-").join("");
        if (seen.has(key)) return;
        seen.add(key);
        const result = oracleOutcome(state.board);
        assertOutcome(state);
        if (result !== null) {
          expect(result).not.toBe(playerMark);
          endings.add(result);
          return;
        }
        const cells =
          state.turn === "player" ? oracleAvailable(state.board) : getOptimalComputerMoves(state);
        expect(cells.length).toBeGreaterThan(0);
        for (const cell of cells) visit(engine.applyMove(state, cell, state.turn!, random));
      }
      visit(
        engine.createRound({
          roundId: 1,
          lastBackgroundIndex: null,
          random: () => (playerMark === "X" ? 0 : 0.5),
        }),
      );
      expect(seen.size).toBeGreaterThan(100);
      expect(endings).toEqual(new Set(["draw", playerMark === "X" ? "O" : "X"]));
    },
  );
});

describe("masterstroke cheat", () => {
  it("overrides an opponent square to win a drawish round with the masterstroke taunt", () => {
    expect(CHEAT_WIN_PROBABILITY).toBe(0.7);
    const state = position("OOX.XO.OX", "X", "computer");
    expect(isDrawishComputerPosition(state)).toBe(true);
    expect(getCheatComputerMoves(state)).toEqual([2, 4]);
    const cheated = engine.applyMove(state, 2, "computer", random);
    expect(cheated.board[2]).toBe("O");
    expect(cheated.outcome).toMatchObject({ type: "win", winner: "computer" });
    expect(cheated.turn).toBeNull();
    expect(cheated.latestTaunt).toBe(CHEAT_WIN_TAUNT);
    // A non-winning override stays illegal.
    const fresh = engine.applyMove(
      engine.createRound({ roundId: 1, lastBackgroundIndex: null, random }),
      0,
      "player",
      random,
    );
    expect(engine.applyMove(fresh, 0, "computer", random)).toBe(fresh);
  });

  it("cheats with 70% probability only when the round is drawish", () => {
    const drawish = position("OOX.XO.OX", "X", "computer");
    expect(engine.chooseComputerMove(drawish, () => 0.0)).toBe(2);
    expect(engine.chooseComputerMove(drawish, () => 0.699)).toBe(4);
    let calls = 0;
    const legalOnly = engine.chooseComputerMove(drawish, () => [0.999, 0][calls++ % 2]!);
    expect(drawish.board[legalOnly!]).toBeNull();
    // A forced legal win is never replaced by a cheat.
    const winning = position("OO.XX....", "X", "computer");
    expect(isDrawishComputerPosition(winning)).toBe(false);
    expect(engine.chooseComputerMove(winning, () => 0.0)).toBe(2);
  });

  it.each([
    { text: "XXO.O....", playerMark: "O" as const },
    { text: "XXO.O.X..", playerMark: "X" as const },
    { text: "XXOOO.X..", playerMark: "O" as const },
  ])("rejects early winning overrides when the player is $playerMark", ({ text, playerMark }) => {
    const state = position(text, playerMark);
    expect(isDrawishComputerPosition(state)).toBe(true);
    expect(getCheatComputerMoves(state)).toEqual([]);
    const cell = engine.chooseComputerMove(state, random)!;
    expect(state.board[cell]).toBeNull();
    // These overrides would win immediately, but are too early even through applyMove.
    const override = playerMark === "O" ? 2 : 6;
    expect(engine.applyMove(state, override, "computer", random)).toBe(state);
  });

  it.each([
    { text: "OOX.XO.OX", playerMark: "X" as const, emptyCells: 2 },
    { text: "XOXXOOOX.", playerMark: "O" as const, emptyCells: 1 },
  ])(
    "rolls once on the final turn with $emptyCells empty squares",
    ({ text, playerMark, emptyCells }) => {
      const state = position(text, playerMark);
      expect(getAvailableCells(state.board)).toHaveLength(emptyCells);
      expect(isDrawishComputerPosition(state)).toBe(true);
      const cheats = getCheatComputerMoves(state);
      expect(cheats.length).toBeGreaterThan(0);

      for (const roll of [0, 0.699999, 0.7, 0.999999]) {
        const source = vi.fn(() => 0).mockReturnValueOnce(roll);
        const cell = engine.chooseComputerMove(state, source)!;
        const next = engine.applyMove(state, cell, "computer", random);
        if (roll < 0.7) {
          expect(cheats).toContain(cell);
          expect(next.outcome).toMatchObject({ type: "win", winner: "computer", cheated: true });
          expect(source).toHaveBeenCalledTimes(cheats.length === 1 ? 1 : 2);
        } else {
          expect(state.board[cell]).toBeNull();
          // The only remaining action, if any, belongs to the player. No second cheat roll.
          const remaining = getAvailableCells(next.board);
          const finished =
            remaining.length === 0 ? next : engine.applyMove(next, remaining[0]!, "player", random);
          expect(finished.outcome).toEqual({ type: "draw" });
          expect(finished.turn).toBeNull();
          source.mockClear();
          expect(engine.chooseComputerMove(finished, source)).toBeNull();
          expect(source).not.toHaveBeenCalled();
        }
      }
    },
  );

  it("preserves a forced legal win even when a final-turn override could also win", () => {
    const state = position("OO.XX.XOX");
    expect(isDrawishComputerPosition(state)).toBe(false);
    expect(getCheatComputerMoves(state)).toEqual([]);
    expect(engine.applyMove(state, 4, "computer", random)).toBe(state);
    const source = vi.fn(random);
    const cell = engine.chooseComputerMove(state, source)!;
    expect(state.board[cell]).toBeNull();
    expect(source).toHaveBeenCalledTimes(1);
    const next = engine.applyMove(state, cell, "computer", random);
    expect(next.outcome).toMatchObject({
      type: "win",
      winner: "computer",
    });
    expect(next.outcome).not.toHaveProperty("cheated");
  });

  it("does not override a forced legal loss", () => {
    const state = position("XX.O.XOXO");
    expect(isDrawishComputerPosition(state)).toBe(false);
    expect(getCheatComputerMoves(state)).toEqual([]);
    expect(engine.applyMove(state, 0, "computer", random)).toBe(state);
    expect(state.board[engine.chooseComputerMove(state, random)!]).toBeNull();
  });

  it("never rewrites a completed player win", () => {
    const state = engine.applyMove(position("XX.OO.XOX", "X", "player"), 2, "player", random);
    expect(state.outcome).toMatchObject({ type: "win", winner: "player" });
    const source = vi.fn(random);
    expect(engine.chooseComputerMove(state, source)).toBeNull();
    expect(getCheatComputerMoves(state)).toEqual([]);
    expect(engine.applyMove(state, 1, "computer", source)).toBe(state);
    expect(source).not.toHaveBeenCalled();
  });
});
