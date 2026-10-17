import type { GameOutcome } from "./contracts";

/** Which computer-win animation to play. */
export type WinCelebrationKind = "fair" | "cheat";

export interface WinCelebrationConfig {
  /** Lines for a computer win through legal play. Shown with the playful animation. */
  readonly fairComputerWin: readonly string[];
  /** Lines for a computer win via a cheat override. Shown with the large reveal animation. */
  readonly cheatComputerWin: readonly string[];
}

/**
 * Edit these lines directly (or pass your own `WinCelebrationConfig` to
 * `selectWinCelebration`) to change the win-animation copy. Add more entries to
 * either array and successive computer wins rotate through them round-robin.
 */
export const defaultWinCelebrations: WinCelebrationConfig = {
  fairComputerWin: ["Aap Pappu ho Kya"],
  cheatComputerWin: ["Ye hain MasterStroke"],
};

/** Player wins and draws have no win celebration; computer wins pick by cheat flag. */
export function getWinCelebrationKind(outcome: GameOutcome): WinCelebrationKind | null {
  if (outcome.type !== "win" || outcome.winner !== "computer") return null;
  return outcome.cheated === true ? "cheat" : "fair";
}

/**
 * Round-robin selection: index 0 shows the first line, 1 the second, wrapping
 * around. The index is per-kind: pass a fair-win count for `"fair"` and a
 * cheat-win count for `"cheat"` so interleaved win types don't make a list
 * appear to skip entries. Kind-local: an empty list returns `""` instead of
 * borrowing the other kind's copy (which would mismatch animation and text).
 */
export function selectWinCelebration(
  config: WinCelebrationConfig,
  kind: WinCelebrationKind,
  occurrenceIndex: number,
): string {
  const lines = (kind === "fair" ? config.fairComputerWin : config.cheatComputerWin)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return "";
  const step = Number.isFinite(occurrenceIndex) ? Math.floor(occurrenceIndex) : 0;
  return lines[((step % lines.length) + lines.length) % lines.length]!;
}
