import type { ThemePreference } from "@tic-tac-chor/design";

export type { ThemePreference } from "@tic-tac-chor/design";

export type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Mark = "X" | "O";
export type Actor = "player" | "computer";
export type Cell = Mark | null;
export type Board = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
export type WinningLine = readonly [CellIndex, CellIndex, CellIndex];

export type GameOutcome =
  | { readonly type: "in-progress" }
  | {
      readonly type: "win";
      readonly winner: Actor;
      readonly mark: Mark;
      readonly line: WinningLine;
      /** True when the computer overrode a player square to force this win. Absent for fair wins. */
      readonly cheated?: boolean;
    }
  | { readonly type: "draw" };

export interface GameState {
  readonly roundId: number;
  readonly board: Board;
  readonly playerMark: Mark;
  readonly turn: Actor | null;
  readonly outcome: GameOutcome;
  readonly backgroundIndex: number;
  readonly latestTaunt: string | null;
}

export interface GameStats {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
}

export type TauntCategory = "opening" | "player-move" | "computer-move" | "computer-win" | "draw";

export type TauntConfig = Readonly<Record<TauntCategory, readonly string[]>> & {
  readonly fallback: string;
};

export interface PersistedSnapshot {
  readonly version: 1;
  readonly stats: GameStats;
  readonly theme: ThemePreference;
  /** Whether move cues play; new saves default to enabled. */
  readonly soundEnabled: boolean;
  /** null means that no background has been used yet. */
  readonly lastBackgroundIndex: number | null;
}

/** Adapters use the shared codec; null represents no usable saved snapshot. */
export interface PersistenceAdapter {
  load(): Promise<PersistedSnapshot | null>;
  save(snapshot: PersistedSnapshot): Promise<void>;
}

/** Must return a value greater than or equal to zero and less than one. */
export type RandomSource = () => number;

/** Defer a one-shot callback by the requested milliseconds; return its cancellation function. */
export interface Scheduler {
  schedule(callback: () => void, delayMs: number): () => void;
}

/**
 * Optional move-cue sink. `playMove` must be best-effort: it may be called for
 * either actor and must never throw, block or delay gameplay. The controller
 * only invokes it while `soundEnabled` is true.
 */
export interface SoundPlayer {
  playMove(actor: Actor): void;
}

export interface CreateRoundOptions {
  readonly roundId: number;
  readonly lastBackgroundIndex: number | null;
  readonly random: RandomSource;
  /** Previous round's latest message, used to avoid repeats across New Game. */
  readonly previousTaunt?: string | null;
}

/** Operations return new state without modifying the input state. */
export interface GameEngine {
  createRound(options: CreateRoundOptions): GameState;
  applyMove(state: GameState, cell: CellIndex, actor: Actor, random: RandomSource): GameState;
  chooseComputerMove(state: GameState, random: RandomSource): CellIndex | null;
}

export function createInitialSnapshot(): PersistedSnapshot {
  return {
    version: 1,
    stats: { wins: 0, losses: 0, draws: 0 },
    theme: "system",
    soundEnabled: true,
    lastBackgroundIndex: null,
  };
}
