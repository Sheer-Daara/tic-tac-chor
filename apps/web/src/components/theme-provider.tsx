import type { ColorScheme, ThemePreference } from "@tic-tac-chor/design";
import { designTokens } from "@tic-tac-chor/design";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { applyTheme, createSystemThemeStore, resolveTheme } from "@/lib/theme";

import { useGame } from "./game-provider";

interface ThemeContextValue {
  readonly theme: ThemePreference;
  readonly resolvedTheme: ColorScheme;
  readonly isReady: boolean;
  readonly setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { controller, snapshot } = useGame();
  const [systemStore] = useState(createSystemThemeStore);
  const system = useSyncExternalStore(
    systemStore.subscribe,
    systemStore.getSnapshot,
    systemStore.getServerSnapshot,
  );
  const theme = snapshot.persisted.theme;
  const resolvedTheme = resolveTheme(theme, system);

  useLayoutEffect(() => {
    applyTheme(document.documentElement, resolvedTheme);
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = designTokens.themes[resolvedTheme].background;
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext
      value={{
        theme,
        resolvedTheme,
        isReady: snapshot.status === "ready",
        setTheme: controller.setThemePreference,
      }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) throw new Error("useTheme requires ThemeProvider");
  return context;
}
