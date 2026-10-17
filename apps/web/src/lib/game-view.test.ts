import { describe, expect, it } from "vite-plus/test";
import { getKeyboardCell } from "./game-view";

describe("keyboard movement", () => {
  it("moves along rows/columns and respects boundaries", () => {
    expect(getKeyboardCell(4, "ArrowLeft")).toBe(3);
    expect(getKeyboardCell(4, "ArrowRight")).toBe(5);
    expect(getKeyboardCell(4, "ArrowUp")).toBe(1);
    expect(getKeyboardCell(4, "ArrowDown")).toBe(7);
    expect(getKeyboardCell(2, "ArrowRight")).toBe(2);
    expect(getKeyboardCell(0, "ArrowLeft")).toBe(0);
    expect(getKeyboardCell(0, "ArrowUp")).toBe(0);
    expect(getKeyboardCell(8, "ArrowDown")).toBe(8);
  });
  it("supports Home/End without hijacking activation or other keys", () => {
    expect(getKeyboardCell(4, "Home")).toBe(0);
    expect(getKeyboardCell(4, "End")).toBe(8);
    expect(getKeyboardCell(4, "Enter")).toBeNull();
    expect(getKeyboardCell(4, " ")).toBeNull();
    expect(getKeyboardCell(4, "Tab")).toBeNull();
  });
});
