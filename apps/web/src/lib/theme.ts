import type { ColorScheme, ThemePreference } from "@tic-tac-chor/design";

export function resolveTheme(preference: ThemePreference, system: ColorScheme): ColorScheme {
  return preference === "system" ? system : preference;
}

export function applyTheme(
  root: {
    classList: Pick<DOMTokenList, "toggle">;
    style: Pick<CSSStyleDeclaration, "colorScheme">;
  },
  theme: ColorScheme,
): void {
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/** One live media query per provider, with symmetric subscription cleanup. */
export function createSystemThemeStore(
  getMedia: () => Pick<
    MediaQueryList,
    "matches" | "addEventListener" | "removeEventListener"
  > = () => window.matchMedia("(prefers-color-scheme: dark)"),
) {
  let media: ReturnType<typeof getMedia> | undefined;
  function getQuery() {
    return (media ??= getMedia());
  }
  return {
    getSnapshot: (): ColorScheme => (getQuery().matches ? "dark" : "light"),
    getServerSnapshot: (): ColorScheme => "light",
    subscribe(onChange: () => void) {
      const query = getQuery();
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
  };
}
