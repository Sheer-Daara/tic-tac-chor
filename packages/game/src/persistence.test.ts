import { describe, expect, it } from "vite-plus/test";
import { createInitialSnapshot } from "./contracts";
import { decodeSnapshot, parseSnapshot, serializeSnapshot } from "./persistence";

describe("versioned snapshot codec", () => {
  it("round-trips only statistics, theme, and carousel position", () => {
    const value = {
      ...createInitialSnapshot(),
      stats: { wins: 10, losses: 3, draws: 4, history: ["secret"] },
      board: ["X"],
      latestTaunt: "dialogue",
      tauntHistory: ["old"],
      future: true,
    };
    const decoded = decodeSnapshot(value);
    expect(decoded).toEqual({
      ...createInitialSnapshot(),
      stats: { wins: 10, losses: 3, draws: 4 },
    });
    expect(decoded?.stats).not.toBe(value.stats);
    expect(JSON.parse(serializeSnapshot(value))).toEqual(decoded);
    expect(parseSnapshot(serializeSnapshot(value))).toEqual(decoded);
  });

  it.each(["light", "dark", "system"] as const)("accepts the %s preference", (theme) => {
    expect(decodeSnapshot({ ...createInitialSnapshot(), theme })?.theme).toBe(theme);
  });

  it("defaults a legacy missing sound preference to enabled and validates explicit values", () => {
    const initial = createInitialSnapshot();
    const { soundEnabled: _soundEnabled, ...legacy } = initial;
    expect(decodeSnapshot(legacy)?.soundEnabled).toBe(true);
    expect(decodeSnapshot({ ...initial, soundEnabled: false })?.soundEnabled).toBe(false);
    expect(decodeSnapshot({ ...initial, soundEnabled: true })?.soundEnabled).toBe(true);
    for (const invalid of ["true", 1, 0, null, {}]) {
      expect(decodeSnapshot({ ...initial, soundEnabled: invalid })).toBeNull();
    }
  });

  it("accepts all bundled positions, null, and safe integer totals", () => {
    for (const lastBackgroundIndex of [null, 0, 1, 2, 3, 4]) {
      const saved = {
        ...createInitialSnapshot(),
        lastBackgroundIndex,
        stats: { wins: Number.MAX_SAFE_INTEGER, losses: 0, draws: 0 },
      };
      expect(decodeSnapshot(saved)).toEqual(saved);
    }
  });

  it("preserves scores and preferences from the retired sixth backdrop", () => {
    const saved = {
      ...createInitialSnapshot(),
      stats: { wins: 7, losses: 2, draws: 3 },
      theme: "dark" as const,
      soundEnabled: false,
      lastBackgroundIndex: 5,
    };
    expect(decodeSnapshot(saved)).toEqual({ ...saved, lastBackgroundIndex: 4 });
  });

  it("rejects malformed JSON, unknown versions, missing fields, and invalid field types", () => {
    for (const json of [null, "", "{", "null", "[]", "true", "1", "{}", '{"version":2}']) {
      expect(parseSnapshot(json)).toBeNull();
    }
    const initial = createInitialSnapshot();
    for (const value of [
      { ...initial, version: "1" },
      { ...initial, version: 2 },
      { ...initial, stats: null },
      { ...initial, stats: [] },
      { ...initial, stats: { wins: 0, losses: 0 } },
      { ...initial, theme: null },
      { ...initial, theme: "auto" },
      { ...initial, lastBackgroundIndex: undefined },
    ])
      expect(decodeSnapshot(value)).toBeNull();
    for (const invalid of [-1, 0.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "0", null]) {
      for (const field of ["wins", "losses", "draws"]) {
        expect(
          decodeSnapshot({ ...initial, stats: { ...initial.stats, [field]: invalid } }),
        ).toBeNull();
      }
    }
    for (const invalid of [-1, 6, 99, 0.5, Number.NaN, Infinity, "0", false]) {
      expect(decodeSnapshot({ ...initial, lastBackgroundIndex: invalid })).toBeNull();
    }
    expect(() => serializeSnapshot({ ...initial, lastBackgroundIndex: 99 })).toThrow(TypeError);
  });
});
