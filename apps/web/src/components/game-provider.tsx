import type { ControllerSnapshot, GameController } from "@tic-tac-chor/game";
import { useGameController } from "@tic-tac-chor/game/react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { createBrowserGameController } from "@/lib/game-controller";

interface GameContextValue {
  readonly controller: GameController;
  readonly snapshot: ControllerSnapshot;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(createBrowserGameController);
  const snapshot = useGameController(controller);
  return <GameContext value={{ controller, snapshot }}>{children}</GameContext>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === null) throw new Error("useGame requires GameProvider");
  return context;
}
