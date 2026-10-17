import type { CellIndex, GameState } from "./contracts";
import type { ControllerSnapshot } from "./controller";
import { getActorMark } from "./engine";

/** Shared status copy keeps actor identity consistent across web and native. */
export function getTurnLabel(snapshot: ControllerSnapshot): string {
  if (snapshot.status === "loading") return "Getting the board ready…";
  const { game } = snapshot;
  if (game.outcome.type === "draw") return "It's a draw!";
  if (game.outcome.type === "win")
    return game.outcome.winner === "player" ? "You won this round!" : "Mudi wins this round";
  return snapshot.isThinking ? "Mudi is thinking…" : "Your move!";
}

/** Describe the actor, position, and available action without relying on color. */
export function getCellLabel(game: GameState, cell: CellIndex, canPlayerMove: boolean): string {
  const location = `Row ${Math.floor(cell / 3) + 1}, column ${(cell % 3) + 1}`;
  const mark = game.board[cell];
  if (mark !== null) {
    const owner = mark === game.playerMark ? "your" : "Mudi's";
    const winning = game.outcome.type === "win" && game.outcome.line.includes(cell);
    return `${location}: ${owner} ${mark}${winning ? ", winning line" : ""}.`;
  }
  if (game.outcome.type !== "in-progress") return `${location}: empty. Round finished.`;
  return canPlayerMove
    ? `${location}: empty. Place your ${getActorMark(game, "player")}.`
    : `${location}: empty. Waiting for Mudi.`;
}
