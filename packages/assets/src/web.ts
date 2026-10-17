import opponent from "../images/opponent.webp";
import knowingSmirk from "../images/modi-knowing-smirk.webp";
import playfulWink from "../images/modi-playful-wink.webp";
import sideEye from "../images/modi-side-eye.webp";
import secretGrin from "../images/modi-secret-grin.webp";
import schemingChin from "../images/modi-scheming-chin.webp";
import playerMove from "../sounds/move-player.wav";
import computerMove from "../sounds/move-computer.wav";
import { createAssetRegistry, createSoundRegistry } from "./index";
import type { AssetRegistry, SoundRegistry } from "./index";

/** Vite's explicit image imports resolve to bundled image URLs. */
export type WebAssetRegistry = AssetRegistry<string>;

export const webAssets: WebAssetRegistry = createAssetRegistry(opponent, {
  "knowing-smirk": knowingSmirk,
  "playful-wink": playfulWink,
  "side-eye": sideEye,
  "secret-grin": secretGrin,
  "scheming-chin": schemingChin,
});

/** Vite resolves the generated WAV imports to bundled audio URLs. */
export const webSounds: SoundRegistry<string> = createSoundRegistry({
  "player-move": playerMove,
  "computer-move": computerMove,
});
