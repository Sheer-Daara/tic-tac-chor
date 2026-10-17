import { BACKGROUND_COUNT } from "@tic-tac-chor/assets";
import type {
  Actor,
  Board,
  CellIndex,
  GameEngine,
  GameOutcome,
  GameState,
  Mark,
  RandomSource,
  TauntConfig,
  WinningLine,
} from "./contracts";
import { getMoveTauntCategory, sampleTaunts, selectTaunt } from "./taunts";

/** Chance of stealing a drawable round on the computer's final scheduled turn. */
export const CHEAT_WIN_PROBABILITY = 0.7;
/** Taunt displayed when the computer wins with an illegal overriding move. */
export const CHEAT_WIN_TAUNT = "Mitron, this is masterstroke";

const winningLines: readonly WinningLine[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function oppositeMark(mark: Mark): Mark {
  return mark === "X" ? "O" : "X";
}

export function getActorMark(state: GameState, actor: Actor): Mark {
  return actor === "player" ? state.playerMark : oppositeMark(state.playerMark);
}

export function getAvailableCells(board: Board): CellIndex[] {
  const cells: CellIndex[] = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === null) cells.push(index as CellIndex);
  }
  return cells;
}

export function getBoardOutcome(board: Board, playerMark: Mark): GameOutcome {
  for (const line of winningLines) {
    const mark = board[line[0]];
    if (mark !== null && mark === board[line[1]] && mark === board[line[2]]) {
      return { type: "win", winner: mark === playerMark ? "player" : "computer", mark, line };
    }
  }
  return board.includes(null) ? { type: "in-progress" } : { type: "draw" };
}

function withMark(board: Board, cell: CellIndex, mark: Mark): Board {
  const next: [...Board] = [...board];
  next[cell] = mark;
  return next;
}

/** Every returned move has the best attainable result against perfect human play. */
export function getOptimalComputerMoves(state: GameState): CellIndex[] {
  if (
    state.turn !== "computer" ||
    state.outcome.type !== "in-progress" ||
    getBoardOutcome(state.board, state.playerMark).type !== "in-progress"
  ) {
    return [];
  }

  const computerMark = getActorMark(state, "computer");
  const scores = new Map<string, number>();
  function minimax(board: Board, turn: Mark): number {
    const outcome = getBoardOutcome(board, state.playerMark);
    if (outcome.type === "win") return outcome.winner === "computer" ? 1 : -1;
    if (outcome.type === "draw") return 0;

    const key = `${board.map((cell) => cell ?? "-").join("")}:${turn}`;
    const cached = scores.get(key);
    if (cached !== undefined) return cached;
    const maximizing = turn === computerMark;
    let score = maximizing ? -Infinity : Infinity;
    for (const cell of getAvailableCells(board)) {
      const candidate = minimax(withMark(board, cell, turn), oppositeMark(turn));
      score = maximizing ? Math.max(score, candidate) : Math.min(score, candidate);
      if (score === (maximizing ? 1 : -1)) break;
    }
    scores.set(key, score);
    return score;
  }

  let best = -Infinity;
  const optimal: CellIndex[] = [];
  for (const cell of getAvailableCells(state.board)) {
    const score = minimax(withMark(state.board, cell, computerMark), state.playerMark);
    if (score > best) {
      best = score;
      optimal.length = 0;
    }
    if (score === best) optimal.push(cell);
  }
  return optimal;
}

/** Winning overrides allowed only on the final computer turn of a drawable round. */
export function getCheatComputerMoves(state: GameState): CellIndex[] {
  if (
    state.turn !== "computer" ||
    state.outcome.type !== "in-progress" ||
    getBoardOutcome(state.board, state.playerMark).type !== "in-progress"
  ) {
    return [];
  }
  const emptyCells = getAvailableCells(state.board).length;
  // One or two empty squares means this is the computer's last scheduled turn,
  // regardless of who opened. Declining the cheat leaves no later chance to reroll.
  if (emptyCells < 1 || emptyCells > 2 || getBestComputerScore(state) !== 0) return [];
  const computerMark = getActorMark(state, "computer");
  const cheats: CellIndex[] = [];
  for (let index = 0; index < state.board.length; index += 1) {
    if (state.board[index] !== state.playerMark) continue;
    const outcome = getBoardOutcome(
      withMark(state.board, index as CellIndex, computerMark),
      state.playerMark,
    );
    if (outcome.type === "win" && outcome.winner === "computer") {
      cheats.push(index as CellIndex);
    }
  }
  return cheats;
}

function getBestComputerScore(state: GameState): number | null {
  if (
    state.turn !== "computer" ||
    state.outcome.type !== "in-progress" ||
    getBoardOutcome(state.board, state.playerMark).type !== "in-progress"
  ) {
    return null;
  }
  const computerMark = getActorMark(state, "computer");
  const scores = new Map<string, number>();
  function minimax(board: Board, turn: Mark): number {
    const outcome = getBoardOutcome(board, state.playerMark);
    if (outcome.type === "win") return outcome.winner === "computer" ? 1 : -1;
    if (outcome.type === "draw") return 0;
    const key = `${board.map((cell) => cell ?? "-").join("")}:${turn}`;
    const cached = scores.get(key);
    if (cached !== undefined) return cached;
    const maximizing = turn === computerMark;
    let score = maximizing ? -Infinity : Infinity;
    for (const cell of getAvailableCells(board)) {
      const candidate = minimax(withMark(board, cell, turn), oppositeMark(turn));
      score = maximizing ? Math.max(score, candidate) : Math.min(score, candidate);
      if (score === (maximizing ? 1 : -1)) break;
    }
    scores.set(key, score);
    return score;
  }
  let best = -Infinity;
  for (const cell of getAvailableCells(state.board)) {
    const score = minimax(withMark(state.board, cell, computerMark), state.playerMark);
    if (score > best) best = score;
    if (best === 1) break;
  }
  return best;
}

/** A drawish round is one where perfect legal play by both sides ends in a draw. */
export function isDrawishComputerPosition(state: GameState): boolean {
  return getBestComputerScore(state) === 0;
}

/** True only for a computer win achieved by overriding a player square. */
export function isCheatWin(outcome: GameOutcome): boolean {
  return outcome.type === "win" && outcome.winner === "computer" && outcome.cheated === true;
}

/** True for a computer win achieved through legal play. */
export function isFairComputerWin(outcome: GameOutcome): boolean {
  return outcome.type === "win" && outcome.winner === "computer" && outcome.cheated !== true;
}

/** Saved positions outside the bundled loop are treated as a fresh installation. */
export function getNextBackgroundIndex(previous: number | null): number {
  return previous !== null &&
    Number.isInteger(previous) &&
    previous >= 0 &&
    previous < BACKGROUND_COUNT
    ? (previous + 1) % BACKGROUND_COUNT
    : 0;
}

export function createGameEngine(options: { readonly taunts?: TauntConfig } = {}): GameEngine {
  const taunts = options.taunts ?? sampleTaunts;
  return {
    createRound({ roundId, lastBackgroundIndex, random, previousTaunt = null }) {
      const playerOpens = random() < 0.5;
      return {
        roundId,
        board: [null, null, null, null, null, null, null, null, null],
        playerMark: playerOpens ? "X" : "O",
        turn: playerOpens ? "player" : "computer",
        outcome: { type: "in-progress" },
        backgroundIndex: getNextBackgroundIndex(lastBackgroundIndex),
        latestTaunt: selectTaunt(taunts, "opening", previousTaunt, random),
      };
    },
    applyMove(state, cell, actor, random) {
      if (
        !Number.isInteger(cell) ||
        cell < 0 ||
        cell > 8 ||
        state.turn !== actor ||
        state.outcome.type !== "in-progress" ||
        getBoardOutcome(state.board, state.playerMark).type !== "in-progress"
      ) {
        return state;
      }
      const occupied = state.board[cell];
      const isCheatOverride =
        actor === "computer" &&
        occupied === state.playerMark &&
        getCheatComputerMoves(state).includes(cell);
      if (occupied !== null && !isCheatOverride) {
        return state;
      }
      const board = withMark(state.board, cell, getActorMark(state, actor));
      const boardOutcome = getBoardOutcome(board, state.playerMark);
      const outcome: GameOutcome =
        isCheatOverride && boardOutcome.type === "win"
          ? { ...boardOutcome, cheated: true }
          : boardOutcome;
      return {
        ...state,
        board,
        outcome,
        turn: outcome.type === "in-progress" ? (actor === "player" ? "computer" : "player") : null,
        latestTaunt: isCheatOverride
          ? CHEAT_WIN_TAUNT
          : selectTaunt(taunts, getMoveTauntCategory(outcome, actor), state.latestTaunt, random),
      };
    },
    chooseComputerMove(state: GameState, random: RandomSource) {
      const optimal = getOptimalComputerMoves(state);
      if (optimal.length === 0) return null;
      const cheats = getCheatComputerMoves(state);
      if (cheats.length > 0) {
        if (random() < CHEAT_WIN_PROBABILITY) {
          if (cheats.length === 1) return cheats[0] ?? null;
          return cheats[Math.floor(random() * cheats.length)] ?? null;
        }
      }
      return optimal[Math.floor(random() * optimal.length)] ?? null;
    },
  };
}
