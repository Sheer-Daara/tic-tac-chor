import { describe, expect, it } from "vite-plus/test";

import { generateThemeCss } from "./css";
import { designTokens, getThemeColors } from "./tokens";

type Rgb = readonly [number, number, number];

function rgb(color: string): Rgb {
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error(`Expected opaque hex color: ${color}`);
  return [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function composite(overlay: string, background: Rgb): Rgb {
  const parts = overlay.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
  if (!parts) throw new Error(`Expected explicit RGBA overlay: ${overlay}`);
  const alpha = Number(parts[4]);
  return background.map(
    (channel, index) => Number(parts[index + 1]) * alpha + channel * (1 - alpha),
  ) as [number, number, number];
}

function luminance(color: Rgb): number {
  const linear = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

function contrast(a: Rgb, b: Rgb): number {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high! + 0.05) / (low! + 0.05);
}

describe.each(["light", "dark"] as const)("%s palette", (scheme) => {
  const colors = designTokens.themes[scheme];

  it("keeps normal, muted and button text readable on their surfaces", () => {
    for (const background of [colors.background, colors.surface, colors.muted]) {
      expect(contrast(rgb(colors.foreground), rgb(background))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(colors.mutedForeground), rgb(background))).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(rgb(colors.primary), rgb(colors.primaryForeground))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(rgb(colors.destructive), rgb(colors.destructiveForeground)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("guarantees readable board marks, grid and text over any image pixel", () => {
    const darkest = composite(colors.boardOverlay, [0, 0, 0]);
    const lightest = composite(colors.boardOverlay, [255, 255, 255]);
    // Each composited RGB channel and its luminance increase monotonically.
    // Keep foreground luminances outside that entire interval, so either extreme
    // is the worst possible image pixel, including both layers of a crossfade.
    for (const [role, minimum] of [
      ["playerMark", 3],
      ["computerMark", 3],
      ["boardGrid", 3],
      ["foreground", 4.5],
      ["mutedForeground", 4.5],
    ] as const) {
      const foreground = rgb(colors[role]);
      const light = luminance(foreground);
      expect(light < luminance(darkest) || light > luminance(lightest)).toBe(true);
      expect(contrast(foreground, darkest)).toBeGreaterThanOrEqual(minimum);
      expect(contrast(foreground, lightest)).toBeGreaterThanOrEqual(minimum);
    }
    expect(colors.playerMark).not.toBe(colors.computerMark);
  });

  it("maps controls onto the same palette used for the game", () => {
    const controls = getThemeColors(scheme);
    expect(controls.card).toBe(colors.surface);
    expect(controls.secondary).toBe(colors.muted);
    expect(controls.cardForeground).toBe(colors.foreground);
    expect(controls.ring).toBe(colors.primary);
    for (const [role, color] of Object.entries(colors)) {
      expect(controls[role as keyof typeof controls]).toBe(color);
    }
  });
});

it("exports shared geometry, scalable type and a short crossfade to CSS", () => {
  const css = generateThemeCss();
  expect(css).toContain(`--game-touch-target: ${designTokens.minimumTouchTarget}px;`);
  expect(designTokens.minimumTouchTarget).toBeGreaterThanOrEqual(44);
  expect(css).toContain(`--game-font-family: ${designTokens.typography.fontFamily};`);
  expect(css).toContain(`--game-font-fun-family: ${designTokens.typography.funFontFamily};`);
  // Two distinct voices: classy interface type and playful dialogue type.
  expect(designTokens.typography.funFontFamily).not.toBe(designTokens.typography.fontFamily);
  expect(css).toContain(
    `--game-motion-background-crossfade: ${designTokens.motion.backgroundCrossfade}ms;`,
  );
  expect(css).toContain(
    `--game-font-size-body: ${designTokens.typography.fontSizes.body / 16}rem;`,
  );
  expect(css).toContain("--color-board-overlay: var(--board-overlay);");
  expect(css).toContain(".dark {");
  expect(css).toBe(generateThemeCss());
});
