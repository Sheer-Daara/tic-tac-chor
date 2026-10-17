import { createAssetRegistry, createSoundRegistry } from "./index";
import type { AssetRegistry, SoundRegistry } from "./index";

declare const require: (path: string) => number;

/** Metro's static image references resolve to numeric bundled asset IDs. */
export type NativeAssetRegistry = AssetRegistry<number>;

export const nativePlayerIcons = {
  player: require("../images/player-mark.svg"),
  computer: require("../images/computer-mark.svg"),
} as const;

/** Literal paths are required so Metro discovers every asset at build time. */
export const nativeAssets: NativeAssetRegistry = createAssetRegistry(
  require("../images/opponent.webp"),
  {
    "knowing-smirk": require("../images/modi-knowing-smirk.webp"),
    "playful-wink": require("../images/modi-playful-wink.webp"),
    "side-eye": require("../images/modi-side-eye.webp"),
    "secret-grin": require("../images/modi-secret-grin.webp"),
    "scheming-chin": require("../images/modi-scheming-chin.webp"),
  },
);

/** Metro's static audio references resolve to numeric bundled asset IDs. */
export const nativeSounds: SoundRegistry<number> = createSoundRegistry({
  "player-move": require("../sounds/move-player.wav"),
  "computer-move": require("../sounds/move-computer.wav"),
});
