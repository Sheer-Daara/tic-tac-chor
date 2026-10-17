import { createGameController } from "@tic-tac-chor/game";

import { createNativePersistenceAdapter } from "./persistence";
import { createNativeSoundPlayer } from "./sound";

export function createNativeGameController() {
  return createGameController({
    storage: createNativePersistenceAdapter(),
    random: Math.random,
    sound: createNativeSoundPlayer(),
    scheduler: {
      schedule(callback, delayMs) {
        const timer = setTimeout(callback, delayMs);
        return () => clearTimeout(timer);
      },
    },
  });
}
