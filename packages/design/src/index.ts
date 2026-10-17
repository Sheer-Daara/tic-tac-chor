/** Persist the preference, not the resolved system appearance. */
export type ThemePreference = "system" | "light" | "dark";

export type ColorScheme = Exclude<ThemePreference, "system">;

export type ColorRole =
  | "background"
  | "foreground"
  | "surface"
  | "muted"
  | "mutedForeground"
  | "border"
  | "primary"
  | "primaryForeground"
  | "destructive"
  | "destructiveForeground"
  | "success"
  | "warning"
  | "info"
  | "playerMark"
  | "computerMark"
  | "boardGrid"
  | "boardOverlay";

export type ColorTokens = Readonly<Record<ColorRole, string>>;

export type SpacingScale = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
export type RadiusScale = "sm" | "md" | "lg" | "xl";
export type FontSizeScale =
  | "caption"
  | "body"
  | "label"
  | "subheading"
  | "section"
  | "heading"
  | "display"
  | "title";
export type FontWeight = 400 | 500 | 600 | 700 | 800;

/** Distances are logical pixels; adapters decide CSS units/native styles. */
export interface DesignTokens {
  readonly themes: Readonly<Record<ColorScheme, ColorTokens>>;
  readonly spacing: Readonly<Record<SpacingScale, number>>;
  readonly radii: Readonly<Record<RadiusScale, number>>;
  readonly typography: {
    readonly fontFamily: string;
    readonly funFontFamily: string;
    readonly fontSizes: Readonly<Record<FontSizeScale, number>>;
    readonly fontWeights: {
      readonly regular: FontWeight;
      readonly medium: FontWeight;
      readonly bold: FontWeight;
    };
  };
  /** Durations are milliseconds; reduced-motion handling belongs to each app. */
  readonly motion: {
    readonly press: number;
    readonly backgroundCrossfade: number;
  };
  readonly minimumTouchTarget: number;
}

export { designTokens, getThemeColors } from "./tokens";
