import { createGameController } from "@tic-tac-chor/game";

import { createBrowserPersistenceAdapter } from "./persistence";
import { createBrowserSoundPlayer } from "./sound";

export function createBrowserGameController() {
  return createGameController({
    storage: createBrowserPersistenceAdapter(),
    random: Math.random,
    sound: createBrowserSoundPlayer(),
    scheduler: {
      schedule(callback, delayMs) {
        const timer = window.setTimeout(callback, delayMs);
        return () => window.clearTimeout(timer);
      },
    },
  });
}
