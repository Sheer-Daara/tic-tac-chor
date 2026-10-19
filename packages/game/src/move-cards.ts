import type { GameState } from "./contracts";
import seededMoveCards from "./move-cards.json";

/**
 * One piece of supplementary information shown after a computer move.
 * Only `title` is required; `description` and `link` may be omitted.
 */
export interface MoveCard {
  readonly title: string;
  readonly description?: string;
  readonly link?: string;
}

/**
 * Async source for move cards. The bundled JSON is a stand-in for a remote
 * content feed; replace the repository to load the same shape over the network.
 */
export interface MoveCardRepository {
  load(): Promise<readonly MoveCard[]>;
}

export interface MoveCardSelection {
  readonly card: MoveCard;
  readonly index: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Keep only absolute HTTP(S) links so seeded or future remote copy cannot inject another scheme. */
function cleanLink(value: unknown): string | null {
  const candidate = cleanText(value);
  return candidate !== null && /^https?:\/\/\S+$/i.test(candidate) ? candidate : null;
}

/**
 * Validate and normalize an untrusted payload. Invalid entries are skipped,
 * optional fields are trimmed away when blank, and duplicate titles keep the first.
 */
export function decodeMoveCards(value: unknown): readonly MoveCard[] {
  if (!Array.isArray(value)) return [];
  const cards: MoveCard[] = [];
  const titles = new Set<string>();
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === null) continue;
    const title = cleanText(record.title);
    if (title === null) continue;
    const titleKey = title.toLocaleLowerCase();
    if (titles.has(titleKey)) continue;
    titles.add(titleKey);
    const description = cleanText(record.description);
    const link = cleanLink(record.link);
    cards.push({
      title,
      ...(description === null ? {} : { description }),
      ...(link === null ? {} : { link }),
    });
  }
  return cards;
}

const seededCards = decodeMoveCards(seededMoveCards);

/** The validated contents of the bundled JSON repository. */
export const localMoveCards: readonly MoveCard[] = seededCards;

/** Create a repository around a local (or test) payload; callers never see the raw JSON. */
export function createLocalMoveCardRepository(
  source: unknown = seededMoveCards,
): MoveCardRepository {
  const cards = decodeMoveCards(source);
  return {
    async load() {
      return cards;
    },
  };
}

/** Default repository. Swap this factory's implementation for a fetch-backed source later. */
export const localMoveCardRepository: MoveCardRepository = createLocalMoveCardRepository();

/**
 * Pick a card, avoiding the immediately previous index while other cards exist.
 * Random out-of-contract values are clamped instead of returning nothing.
 */
export function selectMoveCard(
  cards: readonly MoveCard[],
  previousIndex: number | null,
  random: () => number,
): MoveCardSelection | null {
  if (cards.length === 0) return null;
  if (cards.length === 1) {
    const only = cards[0];
    return only === undefined ? null : { card: only, index: 0 };
  }
  const candidates: number[] = [];
  for (let index = 0; index < cards.length; index += 1) {
    if (index !== previousIndex) candidates.push(index);
  }
  const roll = random();
  const position = Number.isFinite(roll)
    ? Math.min(Math.max(Math.floor(roll * candidates.length), 0), candidates.length - 1)
    : 0;
  const index = candidates[position];
  const card = index === undefined ? undefined : cards[index];
  return card === undefined || index === undefined ? null : { card, index };
}

/**
 * Number of marks the computer currently owns. A successful computer move
 * always increases this by one, even when the opponent overrides a player square.
 */
export function countComputerMarks(game: Pick<GameState, "board" | "playerMark">): number {
  const computerMark = game.playerMark === "X" ? "O" : "X";
  let count = 0;
  for (const cell of game.board) {
    if (cell === computerMark) count += 1;
  }
  return count;
}
