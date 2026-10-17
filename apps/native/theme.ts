import { designTokens, getThemeColors } from "@tic-tac-chor/design";

const sharedTheme = {
  spacing: designTokens.spacing,
  borderRadius: designTokens.radii,
  typography: designTokens.typography,
  motion: designTokens.motion,
  minimumTouchTarget: designTokens.minimumTouchTarget,
  // Retain the starter's keys while using the shared typography scale.
  fontSize: {
    xs: designTokens.typography.fontSizes.caption,
    sm: designTokens.typography.fontSizes.label,
    base: designTokens.typography.fontSizes.body,
    lg: designTokens.typography.fontSizes.subheading,
    xl: designTokens.typography.fontSizes.section,
    "2xl": designTokens.typography.fontSizes.heading,
    "3xl": designTokens.typography.fontSizes.display,
    "4xl": designTokens.typography.fontSizes.title,
  },
} as const;

export const lightTheme = {
  ...sharedTheme,
  colors: getThemeColors("light"),
} as const;

export const darkTheme = {
  ...sharedTheme,
  colors: getThemeColors("dark"),
} as const;
