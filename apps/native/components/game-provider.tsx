import "@/unistyles";
import type { ControllerSnapshot, GameController } from "@tic-tac-chor/game";
import { useGameController } from "@tic-tac-chor/game/react";
import { createContext, use, useLayoutEffect, useState, type ReactNode } from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { Appearance } from "react-native";

import { createNativeGameController } from "@/lib/game-controller";
import { applyNativeThemePreference } from "@/lib/theme-preference";

interface GameContextValue {
  readonly controller: GameController;
  readonly snapshot: ControllerSnapshot;
}

const nativeAppearance = {
  setColorScheme(scheme: "light" | "dark" | "unspecified") {
    // The optional Expo web preview uses Unistyles only; RN Web has no setter.
    if (process.env.EXPO_OS !== "web") Appearance.setColorScheme(scheme);
  },
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(createNativeGameController);
  const snapshot = useGameController(controller);

  useLayoutEffect(() => {
    if (snapshot.status === "ready") {
      applyNativeThemePreference(snapshot.persisted.theme, UnistylesRuntime, nativeAppearance);
    }
  }, [snapshot.status, snapshot.persisted.theme]);

  return <GameContext value={{ controller, snapshot }}>{children}</GameContext>;
}

export function useGame() {
  const context = use(GameContext);
  if (context === null) throw new Error("useGame requires GameProvider");
  return context;
}
