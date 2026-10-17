import { createInitialSnapshot } from "./contracts";
import type {
  Actor,
  CellIndex,
  GameEngine,
  GameState,
  GameStats,
  PersistedSnapshot,
  PersistenceAdapter,
  RandomSource,
  Scheduler,
  SoundPlayer,
  ThemePreference,
} from "./contracts";
import { createGameEngine } from "./engine";
import { decodeSnapshot } from "./persistence";

export const COMPUTER_THINKING_MS = 1_200;

export type ControllerSnapshot =
  | {
      readonly status: "loading";
      readonly game: null;
      readonly persisted: PersistedSnapshot;
      readonly persistenceError: null;
      readonly isThinking: false;
      readonly canPlayerMove: false;
    }
  | {
      readonly status: "ready";
      readonly game: GameState;
      readonly persisted: PersistedSnapshot;
      readonly persistenceError: unknown;
      readonly isThinking: boolean;
      readonly canPlayerMove: boolean;
    };

export interface GameControllerOptions {
  /** Defaults to the shared unbeatable engine. */
  readonly engine?: GameEngine;
  readonly storage: PersistenceAdapter;
  readonly random: RandomSource;
  /** Apps supply a timer adapter; the core never imports platform timer APIs. */
  readonly scheduler: Scheduler;
  /** Optional, best-effort move cue playback; ignored while sound is disabled. */
  readonly sound?: SoundPlayer;
}

export interface GameController {
  getSnapshot(): ControllerSnapshot;
  subscribe(listener: () => void): () => void;
  /** Activate hydration/computer turns and return an idempotent cleanup. */
  start(): () => void;
  /** Player input only; computer actions are exclusively controlled by the scheduler. */
  move(cell: CellIndex, actor?: Actor): void;
  newGame(): void;
  setThemePreference(theme: ThemePreference): void;
  /** Toggle move cues; the choice is persisted with the other preferences. */
  setSoundEnabled(enabled: boolean): void;
  /** The caller confirms this destructive user action before invoking it. */
  resetStats(): void;
  retrySave(): void;
  /** Wait for accepted writes; return the same queue promise until another write is accepted.
   * Failed writes remain observable in the snapshot.
   */
  whenSaved(): Promise<void>;
}

interface PendingComputerMove {
  readonly game: GameState;
  cancel?: () => void;
}

/** Shared gameplay store with serialized, failure-tolerant persistence writes. */
export function createGameController(options: GameControllerOptions): GameController {
  const engine = options.engine ?? createGameEngine();
  let snapshot: ControllerSnapshot = {
    status: "loading",
    game: null,
    persisted: createInitialSnapshot(),
    persistenceError: null,
    isThinking: false,
    canPlayerMove: false,
  };
  const listeners = new Set<() => void>();
  let consumers = 0;
  let generation = 0;
  let roundId = 0;
  let pendingComputerMove: PendingComputerMove | null = null;
  let saveQueue: Promise<void> = Promise.resolve();
  let saveRevision = 0;

  function enqueueSave(persisted: PersistedSnapshot): void {
    const revision = ++saveRevision;
    // Copy/validate now so adapter mutations and later state changes cannot alter this write.
    const saved = decodeSnapshot(persisted);
    saveQueue = saveQueue.then(async () => {
      try {
        if (saved === null) throw new TypeError("Invalid persisted game snapshot");
        await options.storage.save(saved);
        if (
          revision === saveRevision &&
          snapshot.status === "ready" &&
          snapshot.persistenceError !== null
        ) {
          publish(readySnapshot(snapshot.game, snapshot.persisted, null));
        }
      } catch (error) {
        if (snapshot.status === "ready") {
          publish(readySnapshot(snapshot.game, snapshot.persisted, error));
        }
      }
    });
  }

  function cancelComputerMove(): void {
    const pending = pendingComputerMove;
    pendingComputerMove = null;
    pending?.cancel?.();
  }

  function readySnapshot(
    game: GameState,
    persisted: PersistedSnapshot,
    persistenceError: unknown,
  ): ControllerSnapshot {
    const playable = consumers > 0 && game.outcome.type === "in-progress";
    return {
      status: "ready",
      game,
      persisted,
      persistenceError,
      isThinking: playable && game.turn === "computer",
      canPlayerMove: playable && game.turn === "player",
    };
  }

  function syncComputerMove(): void {
    if (snapshot.status !== "ready" || !snapshot.isThinking) {
      cancelComputerMove();
      return;
    }
    if (pendingComputerMove?.game === snapshot.game) return;
    cancelComputerMove();
    const pending: PendingComputerMove = { game: snapshot.game };
    pendingComputerMove = pending;
    pending.cancel = options.scheduler.schedule(() => {
      // Check identity as well as cancellation: even a late or repeated callback is harmless.
      if (
        pendingComputerMove !== pending ||
        consumers === 0 ||
        snapshot.status !== "ready" ||
        snapshot.game !== pending.game ||
        !snapshot.isThinking
      ) {
        return;
      }
      pendingComputerMove = null;
      const cell = engine.chooseComputerMove(snapshot.game, options.random);
      if (cell === null) return;
      commitMove(engine.applyMove(snapshot.game, cell, "computer", options.random), "computer");
    }, COMPUTER_THINKING_MS);
  }

  function publish(next: ControllerSnapshot, shouldPersist = true): void {
    if (next === snapshot) return;
    const persist =
      shouldPersist && next.status === "ready" && next.persisted !== snapshot.persisted;
    snapshot = next;
    // Enqueue before notifying listeners: reentrant setters must retain write order.
    if (persist) enqueueSave(next.persisted);
    syncComputerMove();
    for (const listener of listeners) listener();
  }

  function completedStats(previous: GameState, next: GameState, stats: GameStats): GameStats {
    if (previous.outcome.type !== "in-progress" || next.outcome.type === "in-progress") {
      return stats;
    }
    const counter =
      next.outcome.type === "draw" ? "draws" : next.outcome.winner === "player" ? "wins" : "losses";
    // Valid loaded totals can already be at the numeric limit; keep future snapshots serializable.
    if (stats[counter] === Number.MAX_SAFE_INTEGER) return stats;
    return { ...stats, [counter]: stats[counter] + 1 };
  }

  function commitMove(game: GameState, actor: Actor): void {
    if (snapshot.status !== "ready" || game === snapshot.game) return;
    const stats = completedStats(snapshot.game, game, snapshot.persisted.stats);
    const persisted =
      stats === snapshot.persisted.stats ? snapshot.persisted : { ...snapshot.persisted, stats };
    // Cue before publishing so the sound and the visual update land together,
    // and so a same-tick computer follow-up cannot pre-empt this cue.
    if (persisted.soundEnabled) options.sound?.playMove(actor);
    publish(readySnapshot(game, persisted, snapshot.persistenceError));
  }

  function createRound(
    lastBackgroundIndex: number | null,
    previousTaunt?: string | null,
  ): GameState {
    return engine.createRound({
      roundId: ++roundId,
      lastBackgroundIndex,
      random: options.random,
      ...(previousTaunt === undefined ? {} : { previousTaunt }),
    });
  }

  function withBackground(persisted: PersistedSnapshot, game: GameState): PersistedSnapshot {
    return persisted.lastBackgroundIndex === game.backgroundIndex
      ? persisted
      : { ...persisted, lastBackgroundIndex: game.backgroundIndex };
  }

  async function hydrate(token: number): Promise<void> {
    let persisted = createInitialSnapshot();
    let persistenceError: unknown = null;
    let loadFailed = false;
    try {
      persisted = decodeSnapshot(await options.storage.load()) ?? persisted;
    } catch (error) {
      persistenceError = error;
      loadFailed = true;
    }
    if (token !== generation || consumers === 0) return;
    const game = createRound(persisted.lastBackgroundIndex);
    // A failed read may conceal valid saved data. Do not overwrite it merely by opening the app.
    publish(readySnapshot(game, withBackground(persisted, game), persistenceError), !loadFailed);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      consumers += 1;
      if (consumers === 1) {
        if (snapshot.status === "loading") {
          void hydrate(++generation);
        } else {
          publish(readySnapshot(snapshot.game, snapshot.persisted, snapshot.persistenceError));
        }
      }
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        consumers -= 1;
        if (consumers === 0) {
          generation += 1;
          cancelComputerMove();
          if (snapshot.status === "ready") {
            publish(readySnapshot(snapshot.game, snapshot.persisted, snapshot.persistenceError));
          }
        }
      };
    },
    move(cell, actor = "player") {
      if (snapshot.status !== "ready" || !snapshot.canPlayerMove || actor !== "player") return;
      commitMove(engine.applyMove(snapshot.game, cell, "player", options.random), "player");
    },
    newGame() {
      if (consumers === 0 || snapshot.status !== "ready") return;
      cancelComputerMove();
      const game = createRound(snapshot.game.backgroundIndex, snapshot.game.latestTaunt);
      publish(
        readySnapshot(game, withBackground(snapshot.persisted, game), snapshot.persistenceError),
      );
    },
    setThemePreference(theme) {
      if (consumers === 0 || snapshot.status !== "ready" || snapshot.persisted.theme === theme)
        return;
      if (theme !== "light" && theme !== "dark" && theme !== "system") return;
      publish(
        readySnapshot(snapshot.game, { ...snapshot.persisted, theme }, snapshot.persistenceError),
      );
    },
    setSoundEnabled(enabled) {
      if (
        consumers === 0 ||
        snapshot.status !== "ready" ||
        typeof enabled !== "boolean" ||
        snapshot.persisted.soundEnabled === enabled
      ) {
        return;
      }
      publish(
        readySnapshot(
          snapshot.game,
          { ...snapshot.persisted, soundEnabled: enabled },
          snapshot.persistenceError,
        ),
      );
    },
    resetStats() {
      if (consumers === 0 || snapshot.status !== "ready") return;
      const { wins, losses, draws } = snapshot.persisted.stats;
      if (wins === 0 && losses === 0 && draws === 0) return;
      publish(
        readySnapshot(
          snapshot.game,
          { ...snapshot.persisted, stats: { wins: 0, losses: 0, draws: 0 } },
          snapshot.persistenceError,
        ),
      );
    },
    retrySave() {
      if (consumers === 0 || snapshot.status !== "ready") return;
      enqueueSave(snapshot.persisted);
    },
    whenSaved: () => saveQueue,
  };
}
