import type { ColorScheme, ThemePreference } from "@tic-tac-chor/design";

interface ThemeRuntime {
  setAdaptiveThemes(enabled: boolean): void;
  setTheme(theme: ColorScheme): void;
}

interface NativeAppearance {
  setColorScheme(scheme: ColorScheme | "unspecified"): void;
}

/** Adaptive themes keep System live; explicit overrides opt out until System is selected again. */
export function applyNativeThemePreference(
  preference: ThemePreference,
  runtime: ThemeRuntime,
  appearance: NativeAppearance,
) {
  if (preference === "system") {
    appearance.setColorScheme("unspecified");
    runtime.setAdaptiveThemes(true);
  } else {
    runtime.setAdaptiveThemes(false);
    // Native alerts and other system-provided controls need the same app override.
    appearance.setColorScheme(preference);
    runtime.setTheme(preference);
  }
}
