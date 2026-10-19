import { describe, expect, it } from "vite-plus/test";
import type { Board, Mark } from "./contracts";
import {
  countComputerMarks,
  createLocalMoveCardRepository,
  decodeMoveCards,
  localMoveCards,
  selectMoveCard,
  type MoveCard,
} from "./move-cards";

function board(text: string): Board {
  if (!/^[XO.]{9}$/.test(text)) throw new Error("A board fixture must contain nine cells");
  return [...text].map((cell) =>
    cell === "." ? null : cell === "X" ? "X" : "O",
  ) as unknown as Board;
}

function game(text: string, playerMark: Mark) {
  return { board: board(text), playerMark };
}

describe("move card repository", () => {
  it("ships a varied seed where optional fields are actually optional", () => {
    expect(localMoveCards.length).toBeGreaterThanOrEqual(10);
    expect(new Set(localMoveCards.map((card) => card.title)).size).toBe(localMoveCards.length);
    expect(localMoveCards.some((card) => card.description === undefined)).toBe(true);
    expect(localMoveCards.some((card) => card.link === undefined)).toBe(true);
    expect(localMoveCards.some((card) => card.description && card.link)).toBe(true);
    for (const card of localMoveCards) {
      expect(card.title).toBe(card.title.trim());
      expect(card.title.length).toBeGreaterThan(0);
      if (card.link !== undefined) expect(card.link).toMatch(/^https?:\/\//);
    }
  });

  it("normalizes valid entries and skips malformed ones", () => {
    const cards = decodeMoveCards([
      {
        title: "  Centre first  ",
        description: "  Four lines.  ",
        link: "  https://example.com/x  ",
      },
      { title: "   ", description: "no title" },
      { title: "Title only" },
      null,
      "not a card",
      [],
      { title: "Centre first", description: "duplicate title" },
      { title: "Optional gaps", description: "   ", link: "" },
    ]);
    expect(cards).toEqual([
      { title: "Centre first", description: "Four lines.", link: "https://example.com/x" },
      { title: "Title only" },
      { title: "Optional gaps" },
    ]);
  });

  it("drops unsafe or malformed optional links without dropping the card", () => {
    const cards = decodeMoveCards([
      { title: "Script", link: "javascript:alert(1)" },
      { title: "Relative", link: "/local" },
      { title: "Not a url", link: "not a url" },
      { title: "Mail", link: "mailto:someone@example.com" },
      { title: "Fine", link: "https://example.com" },
    ]);
    expect(cards).toEqual([
      { title: "Script" },
      { title: "Relative" },
      { title: "Not a url" },
      { title: "Mail" },
      { title: "Fine", link: "https://example.com" },
    ]);
  });

  it("returns no cards for an entirely invalid payload", () => {
    expect(decodeMoveCards(null)).toEqual([]);
    expect(decodeMoveCards({ cards: [] })).toEqual([]);
    expect(decodeMoveCards([{ description: "missing title" }])).toEqual([]);
  });

  it("loads the local repository asynchronously through the shared contract", async () => {
    const repository = createLocalMoveCardRepository([{ title: " Local seed " }]);
    await expect(repository.load()).resolves.toEqual([{ title: "Local seed" }]);
  });
});

describe("move card selection", () => {
  const cards: readonly MoveCard[] = [
    { title: "First" },
    { title: "Second", description: "Second card" },
    { title: "Third", link: "https://example.com" },
  ];

  it("returns nothing without cards and the only card for a single-item source", () => {
    expect(selectMoveCard([], null, () => 0)).toBeNull();
    expect(selectMoveCard([{ title: "Only" }], 0, () => 0.99)).toEqual({
      card: { title: "Only" },
      index: 0,
    });
  });

  it("avoids the previous card while cycling through the rest", () => {
    expect(selectMoveCard(cards, 1, () => 0)).toEqual({ card: cards[0], index: 0 });
    expect(selectMoveCard(cards, 0, () => 0.999)).toEqual({ card: cards[2], index: 2 });
    expect(selectMoveCard(cards, 0, () => 0.5)?.index).not.toBe(0);
  });

  it("always returns a card even for a previous index outside the source", () => {
    for (const previous of [null, -1, 99]) {
      const result = selectMoveCard(cards, previous, () => 0.999);
      expect(result).not.toBeNull();
      expect(cards).toContain(result?.card);
    }
  });

  it("clamps random values that fall outside the contract", () => {
    expect(selectMoveCard(cards, 0, () => 1)?.index).toBe(2);
    expect(selectMoveCard(cards, 0, () => Number.NaN)?.index).toBe(1);
  });
});

describe("computer move detection", () => {
  it("counts the computer's marks for either opener", () => {
    expect(countComputerMarks(game("XO.X.OO..", "X"))).toBe(3);
    expect(countComputerMarks(game("XO.X.OO..", "O"))).toBe(2);
    expect(countComputerMarks(game(".........", "X"))).toBe(0);
  });

  it("still advances when a cheat override replaces a player square", () => {
    expect(countComputerMarks(game("OOOXX....", "X"))).toBe(3);
  });
});
