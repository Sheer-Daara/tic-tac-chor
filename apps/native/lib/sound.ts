import { nativeSounds } from "@tic-tac-chor/assets/native";
import type { Actor, SoundPlayer } from "@tic-tac-chor/game";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/** Metro resolves these to bundled asset IDs for the two generated WAV cues. */
const sources: Record<Actor, number> = {
  player: nativeSounds.playerMove,
  computer: nativeSounds.computerMove,
};

/** Keep the human cue a touch louder than the opponent's reply. */
const volumes: Record<Actor, number> = { player: 0.6, computer: 0.4 };

/**
 * Plays the distinct move cues with one lazily created, reused `AudioPlayer`
 * per actor. Playback is best-effort: audio-session or native failures are
 * swallowed so a cue can never block or delay a move.
 */
export function createNativeSoundPlayer(): SoundPlayer {
  const players = new Map<Actor, AudioPlayer>();

  // Respect the hardware mute/ringer switch and mix with other audio instead of
  // interrupting it; a missing audio session must not stop the game.
  void setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: "mixWithOthers",
  }).catch(() => {});

  function getPlayer(actor: Actor): AudioPlayer {
    const existing = players.get(actor);
    if (existing) return existing;
    const player = createAudioPlayer(sources[actor]);
    player.volume = volumes[actor];
    players.set(actor, player);
    return player;
  }

  return {
    playMove(actor) {
      try {
        const player = getPlayer(actor);
        // Rewind short cues so rapid replies never clip or resume mid-sample.
        void player.seekTo(0).catch(() => {});
        player.play();
      } catch {
        // A missing native module or device audio error must not affect play.
      }
    },
  };
}
