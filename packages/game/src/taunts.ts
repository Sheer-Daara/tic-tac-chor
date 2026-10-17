import type { Actor, GameOutcome, RandomSource, TauntCategory, TauntConfig } from "./contracts";

/** Replace these sample lines directly to give both apps the same personality. */
export const sampleTaunts: TauntConfig = {
  opening: [
    "Chaliye, ek nayi baazi ho jaaye!",
    "Board taiyaar hai. Muqabla shuru karein!",
    "Naya round, nayi yojana. Dekhte hain!",
  ],
  "player-move": [
    "Wah, kya chaal chali hai!",
    "Aapki chaal note kar li gayi hai.",
    "Achha ji, ab meri baari!",
  ],
  "computer-move": [
    "Agli chaal ka intezaam ho chuka hai.",
    "Yeh chaal poori taiyaari se aayi hai!",
    "Board par thoda sa masterstroke!",
  ],
  "computer-win": [
    "Jeet ki taiyaari pehle se thi!",
    "Ek aur baazi, ek aur masterstroke!",
    "Agla round? Yojana taiyaar hai!",
    "Mitron, this is masterstroke",
  ],
  draw: [
    "Draw? Is par committee baithegi.",
    "Barabari hui. Agli baazi mein milte hain!",
    "Dono taraf se poori taiyaari thi!",
  ],
  fallback: "Chaliye, khel jaari rakhein!",
};

const emergencyFallbacks = ["Chaliye, khel jaari rakhein!", "Agli chaal ka intezaar hai!"];

/** Invalid/empty copy is skipped, and the last displayed line is never selected again. */
export function selectTaunt(
  config: TauntConfig,
  category: TauntCategory | null,
  previous: string | null,
  random: RandomSource,
): string {
  const lines = category === null ? [] : config[category];
  const candidates = [...new Set(lines.map((line) => line.trim()))].filter(
    (line) => line.length > 0 && line !== previous,
  );
  if (candidates.length > 0) return candidates[Math.floor(random() * candidates.length)]!;
  const fallback = config.fallback.trim();
  if (fallback.length > 0 && fallback !== previous) return fallback;
  return emergencyFallbacks.find((line) => line !== previous)!;
}

/** A terminal outcome takes precedence over the actor's ordinary move category. */
export function getMoveTauntCategory(outcome: GameOutcome, actor: Actor): TauntCategory | null {
  if (outcome.type === "draw") return "draw";
  if (outcome.type === "win") return outcome.winner === "computer" ? "computer-win" : null;
  return actor === "player" ? "player-move" : "computer-move";
}
