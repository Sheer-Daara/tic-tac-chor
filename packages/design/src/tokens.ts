import type { ColorScheme, DesignTokens } from "./index";

/** One source for CSS and native Unistyles; colors use React Native-safe formats. */
export const designTokens = {
  themes: {
    light: {
      background: "#fff8ed",
      foreground: "#2b211d",
      surface: "#ffffff",
      muted: "#f0e5d6",
      mutedForeground: "#635347",
      border: "#c5ae98",
      primary: "#9d351d",
      primaryForeground: "#ffffff",
      destructive: "#b52b35",
      destructiveForeground: "#ffffff",
      success: "#26734b",
      warning: "#8b5a0a",
      info: "#236181",
      playerMark: "#00636b",
      computerMark: "#9e3320",
      boardGrid: "#756357",
      boardOverlay: "rgba(255, 248, 237, 0.84)",
    },
    dark: {
      background: "#211f20",
      foreground: "#fff4e8",
      surface: "#302b2b",
      muted: "#3e3533",
      mutedForeground: "#cbbbae",
      border: "#806c61",
      primary: "#ffa77a",
      primaryForeground: "#2b211d",
      destructive: "#ff9aa4",
      destructiveForeground: "#2b211d",
      success: "#91d9ac",
      warning: "#f3cc85",
      info: "#9dd4f0",
      playerMark: "#75dfd5",
      computerMark: "#ffad8a",
      boardGrid: "#c7b19d",
      boardOverlay: "rgba(33, 31, 32, 0.88)",
    },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radii: { sm: 8, md: 12, lg: 20, xl: 28 },
  typography: {
    /** Classy interface voice: an editorial serif used for everything structural. */
    fontFamily: '"Fraunces Variable", "Iowan Old Style", Georgia, ui-serif, serif',
    /** Playful voice: reserved for dialogue, taunts and celebration copy. */
    funFontFamily: '"Baloo 2 Variable", "Baloo 2", ui-rounded, sans-serif',
    fontSizes: {
      caption: 12,
      body: 16,
      label: 14,
      subheading: 18,
      section: 20,
      heading: 24,
      display: 30,
      title: 36,
    },
    fontWeights: { regular: 400, medium: 600, bold: 800 },
  },
  motion: { press: 120, backgroundCrossfade: 240 },
  minimumTouchTarget: 44,
} as const satisfies DesignTokens;

/** Keep starter control roles aligned with the same semantic game palette. */
export function getThemeColors(scheme: ColorScheme) {
  const colors = designTokens.themes[scheme];
  return {
    ...colors,
    typography: colors.foreground,
    card: colors.surface,
    cardForeground: colors.foreground,
    popover: colors.surface,
    popoverForeground: colors.foreground,
    secondary: colors.muted,
    secondaryForeground: colors.foreground,
    accent: colors.muted,
    accentForeground: colors.foreground,
    input: colors.border,
    ring: colors.primary,
    sidebar: colors.surface,
    sidebarForeground: colors.foreground,
    sidebarPrimary: colors.primary,
    sidebarPrimaryForeground: colors.primaryForeground,
    sidebarAccent: colors.muted,
    sidebarAccentForeground: colors.foreground,
    sidebarBorder: colors.border,
    sidebarRing: colors.primary,
  } as const;
}
