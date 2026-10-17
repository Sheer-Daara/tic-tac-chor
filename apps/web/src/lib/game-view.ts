import type { CellIndex } from "@tic-tac-chor/game";

/** Directions stop at board edges; Home/End address the whole board. */
export function getKeyboardCell(cell: CellIndex, key: string): CellIndex | null {
  const row = Math.floor(cell / 3);
  const column = cell % 3;
  if (key === "Home") return 0;
  if (key === "End") return 8;
  if (key === "ArrowLeft") return (row * 3 + Math.max(0, column - 1)) as CellIndex;
  if (key === "ArrowRight") return (row * 3 + Math.min(2, column + 1)) as CellIndex;
  if (key === "ArrowUp") return (Math.max(0, row - 1) * 3 + column) as CellIndex;
  if (key === "ArrowDown") return (Math.min(2, row + 1) * 3 + column) as CellIndex;
  return null;
}
