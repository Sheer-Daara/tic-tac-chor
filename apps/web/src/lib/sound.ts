import { webSounds } from "@tic-tac-chor/assets/web";
import type { Actor, SoundPlayer } from "@tic-tac-chor/game";

/** Vite resolves these to the generated, royalty-free WAV URLs at build time. */
const sources: Record<Actor, string> = {
  player: webSounds.playerMove,
  computer: webSounds.computerMove,
};

/** Keep the human cue a touch louder than the opponent's reply. */
const volumes: Record<Actor, number> = { player: 0.7, computer: 0.45 };

/**
 * Plays the distinct move cues with one preloaded HTMLAudioElement per actor.
 *
 * Playback is best-effort: autoplay policies, missing/unsupported audio and
 * media errors are swallowed so they can never block or delay a move. The
 * human's cue runs inside their tap/click, which also unlocks later programmatic
 * playback (for example the computer's reply) for the rest of the session.
 */
export function createBrowserSoundPlayer(): SoundPlayer {
  const elements = new Map<Actor, HTMLAudioElement>();
  const supported = typeof Audio !== "undefined";

  function getElement(actor: Actor): HTMLAudioElement {
    const existing = elements.get(actor);
    if (existing) return existing;
    const element = new Audio(sources[actor]);
    element.preload = "auto";
    element.volume = volumes[actor];
    elements.set(actor, element);
    return element;
  }

  if (supported) {
    // Warm the cache during setup so the first cue is not lost to buffering.
    getElement("player");
    getElement("computer");
  }

  return {
    playMove(actor) {
      if (!supported) return;
      const element = getElement(actor);
      try {
        // Rewind short cues so rapid replies never clip or resume mid-sample.
        if (element.readyState > 0) element.currentTime = 0;
        void element.play().catch(() => {
          // Ignore autoplay/decoding rejections; a silent cue is acceptable.
        });
      } catch {
        // Ignore synchronous media errors as well.
      }
    },
  };
}
