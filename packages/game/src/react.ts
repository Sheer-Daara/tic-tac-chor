import { useEffect, useSyncExternalStore } from "react";
import type { ControllerSnapshot, GameController } from "./controller";

export type { ControllerSnapshot, GameController } from "./controller";

/** Keep the controller instance stable (for example, create it with a useState initializer). */
export function useGameController(controller: GameController): ControllerSnapshot {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => controller.start(), [controller]);
  return snapshot;
}
