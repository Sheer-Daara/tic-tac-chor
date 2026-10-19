import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ControllerSnapshot, GameController } from "./controller";
import type { GameState, RandomSource } from "./contracts";
import {
  countComputerMarks,
  localMoveCardRepository,
  selectMoveCard,
  type MoveCard,
  type MoveCardRepository,
} from "./move-cards";

export type { ControllerSnapshot, GameController } from "./controller";
export type { MoveCard, MoveCardRepository, MoveCardSelection } from "./move-cards";

/** Keep the controller instance stable (for example, create it with a useState initializer). */
export function useGameController(controller: GameController): ControllerSnapshot {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => controller.start(), [controller]);
  return snapshot;
}

export interface ComputerMoveCardOptions {
  /** Defaults to the bundled local JSON repository. Keep the reference stable. */
  readonly repository?: MoveCardRepository;
  /** Defaults to Math.random; injected for deterministic tests or previews. */
  readonly random?: RandomSource;
}

export interface ComputerMoveCardState {
  readonly card: MoveCard | null;
  /** Increments for each displayed card; useful as a React key or animation trigger. */
  readonly occurrence: number;
  readonly dismiss: () => void;
}

interface VisibleCard {
  readonly card: MoveCard;
  readonly occurrence: number;
}

/**
 * Select a fresh card whenever the computer adds a mark. The first observation
 * of a round establishes a baseline, so mounting mid-round does not replay old
 * moves. Cards load asynchronously, so a move that lands before the source is
 * ready is shown once it resolves. Starting a new round dismisses any old card.
 */
export function useComputerMoveCard(
  game: GameState | null,
  options: ComputerMoveCardOptions = {},
): ComputerMoveCardState {
  const repository = options.repository ?? localMoveCardRepository;
  const random = options.random ?? Math.random;
  const [cards, setCards] = useState<readonly MoveCard[]>([]);
  const [visible, setVisible] = useState<VisibleCard | null>(null);
  const seen = useRef<{ readonly roundId: number; readonly count: number } | null>(null);
  const previousIndex = useRef<number | null>(null);
  const occurrences = useRef(0);
  const roundId = game?.roundId ?? null;

  useEffect(() => {
    let active = true;
    void repository.load().then(
      (loaded) => {
        if (active) setCards(loaded);
      },
      // Supplementary copy must never affect play if a future remote source fails.
      () => {},
    );
    return () => {
      active = false;
    };
  }, [repository]);

  // A different round (or leaving the game) invalidates the old move's note.
  useEffect(() => setVisible(null), [roundId]);

  useEffect(() => {
    if (game === null) {
      seen.current = null;
      return;
    }
    const count = countComputerMarks(game);
    const last = seen.current;
    if (last === null || last.roundId !== game.roundId) {
      seen.current = { roundId: game.roundId, count };
      return;
    }
    if (count <= last.count) {
      if (count < last.count) seen.current = { roundId: game.roundId, count };
      return;
    }
    // Do not consume the move while the source is still loading; show it on arrival.
    if (cards.length === 0) return;
    const selection = selectMoveCard(cards, previousIndex.current, random);
    if (selection === null) return;
    seen.current = { roundId: game.roundId, count };
    previousIndex.current = selection.index;
    occurrences.current += 1;
    setVisible({ card: selection.card, occurrence: occurrences.current });
  }, [game, cards, random]);

  const dismiss = useCallback(() => setVisible(null), []);
  return { card: visible?.card ?? null, occurrence: visible?.occurrence ?? 0, dismiss };
}
