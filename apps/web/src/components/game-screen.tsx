import { webAssets } from "@tic-tac-chor/assets/web";
import {
  getActorMark,
  getWinCelebrationKind,
  type CellIndex,
  type ControllerSnapshot,
  type GameState,
} from "@tic-tac-chor/game";
import { Button } from "@tic-tac-chor/ui/components/button";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getCellLabel, getTurnLabel } from "@tic-tac-chor/game/presentation";
import { getKeyboardCell } from "@/lib/game-view";
import { BoardBackdrop } from "./board-backdrop";
import { useGame } from "./game-provider";
import { Mark } from "./marks";
import { WinCelebration } from "./win-celebration";
import "./game-screen.css";

const CELL_INDICES: readonly CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function GameBoard({ snapshot }: { snapshot: Extract<ControllerSnapshot, { status: "ready" }> }) {
  const { controller } = useGame();
  const { game, canPlayerMove } = snapshot;
  const [activeCell, setActiveCell] = useState<CellIndex>(0);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, cell: CellIndex) {
    const destination = getKeyboardCell(cell, event.key);
    if (destination === null || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    setActiveCell(destination);
    cells.current[destination]?.focus();
  }
  return (
    <div
      className="game-board"
      role="group"
      aria-labelledby="board-heading"
      aria-describedby="board-help"
    >
      <BoardBackdrop backgroundIndex={game.backgroundIndex} />
      <div className="game-board__cells">
        {CELL_INDICES.map((cell) => {
          const mark = game.board[cell];
          const winning = game.outcome.type === "win" && game.outcome.line.includes(cell);
          const actor =
            mark === null ? undefined : mark === game.playerMark ? "player" : "computer";
          return (
            <button
              key={cell}
              ref={(element) => {
                cells.current[cell] = element;
              }}
              className="game-cell"
              type="button"
              data-cell={cell}
              data-actor={actor}
              data-winning={winning || undefined}
              aria-label={getCellLabel(game, cell, canPlayerMove)}
              aria-disabled={!canPlayerMove || mark !== null}
              tabIndex={activeCell === cell ? 0 : -1}
              onFocus={() => setActiveCell(cell)}
              onKeyDown={(event) => navigate(event, cell)}
              onClick={() => {
                if (canPlayerMove && mark === null) controller.move(cell);
              }}
            >
              {mark !== null ? (
                <Mark
                  glyph={mark}
                  className="game-mark"
                  dataActor={mark === game.playerMark ? "player" : "computer"}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** In-memory per-kind rotation so fair/cheat lists advance independently. */
function useCelebrationOccurrence(game: GameState | null) {
  const counts = useRef({ fair: 0, cheat: 0 });
  const lastCountedRound = useRef<number | null>(null);
  const kind =
    game !== null && game.outcome.type === "win" && game.outcome.winner === "computer"
      ? getWinCelebrationKind(game.outcome)
      : null;
  const index = kind === null ? 0 : counts.current[kind];
  useEffect(() => {
    if (kind !== null && game !== null && lastCountedRound.current !== game.roundId) {
      lastCountedRound.current = game.roundId;
      counts.current[kind] += 1;
    }
  }, [game, kind]);
  return { kind, index };
}

export function GameScreen() {
  const { controller, snapshot } = useGame();
  const game = snapshot.game;
  const celebration = useCelebrationOccurrence(game);
  const turnLabel = getTurnLabel(snapshot);
  const { wins, losses, draws } = snapshot.persisted.stats;
  const completed = game !== null && game.outcome.type !== "in-progress";
  return (
    <main id="game-main" tabIndex={-1} className="game-screen">
      <h1 className="sr-only">Tic-Tac-Chor</h1>
      <section className="game-opponent" aria-label="Your opponent">
        <div className="game-opponent__portrait">
          <img
            src={webAssets.opponent.source}
            alt=""
            width={512}
            height={512}
            decoding="async"
            draggable={false}
          />
        </div>
        <div className="game-opponent__meta">
          <p className="game-opponent__name">Hi Frand</p>
          <p className="game-turn" role="status" aria-live="polite" aria-atomic="true">
            <span
              className="game-turn__dot"
              data-thinking={snapshot.isThinking || undefined}
              aria-hidden="true"
            />
            <span>
              <span className="sr-only">{game === null ? "" : `Round ${game.roundId}. `}</span>
              {turnLabel}
            </span>
          </p>
        </div>
        {game !== null ? (
          <div className="game-players" aria-label="Round marks">
            <span>
              <Mark
                glyph={getActorMark(game, "player")}
                className="game-players__mark"
                dataActor="player"
              />
              You
            </span>
            <span>
              <Mark
                glyph={getActorMark(game, "computer")}
                className="game-players__mark"
                dataActor="computer"
              />
              Mudi
            </span>
          </div>
        ) : null}
      </section>
      <h2 className="sr-only" id="board-heading">
        {game === null ? "Tic-tac-toe board" : `Round ${game.roundId} tic-tac-toe board`}
      </h2>
      <p className="sr-only" id="board-help">
        Use the arrow keys to explore squares, Home for the first square, End for the last. Press
        Enter or Space to play an empty square on your turn.
      </p>
      <div className="game-board-wrap">
        {snapshot.status === "ready" ? (
          <GameBoard snapshot={snapshot} />
        ) : (
          <div className="game-board game-board--loading" aria-hidden="true">
            <Mark glyph="X" className="game-mark" />
            <Mark glyph="O" className="game-mark" />
          </div>
        )}
      </div>
      {game !== null &&
      game.outcome.type === "win" &&
      game.outcome.winner === "computer" &&
      celebration.kind !== null ? (
        <WinCelebration
          key={`${game.roundId}-${celebration.kind}`}
          outcome={game.outcome}
          occurrenceIndex={celebration.index}
        />
      ) : null}
      <p className="game-taunt" aria-live="polite" aria-atomic="true">
        {game?.latestTaunt ?? "A new board. A new masterplan."}
      </p>
      <section className="game-results" aria-label="Your results on this device">
        <Button
          className="game-new-round"
          size="lg"
          disabled={snapshot.status !== "ready"}
          onClick={() => controller.newGame()}
        >
          <RotateCcw data-icon="inline-start" />
          {completed ? "Play again" : "New game"}
        </Button>
        <dl className="game-scoreboard">
          <div>
            <dt>Wins</dt>
            <dd>{wins.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Losses</dt>
            <dd>{losses.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Draws</dt>
            <dd>{draws.toLocaleString()}</dd>
          </div>
        </dl>
      </section>
      <footer className="game-footer">Just a game. All dialogue is authored satire.</footer>
    </main>
  );
}
