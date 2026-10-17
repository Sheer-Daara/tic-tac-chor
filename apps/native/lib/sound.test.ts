import { describe, expect, it, vi } from "vite-plus/test";

interface FakePlayer {
  readonly source: number;
  volume: number;
  readonly play: ReturnType<typeof vi.fn>;
  readonly seekTo: ReturnType<typeof vi.fn>;
}

const audio = vi.hoisted(() => ({
  players: [] as FakePlayer[],
  modes: [] as unknown[],
}));

vi.mock("@tic-tac-chor/assets/native", () => ({
  nativeSounds: { playerMove: 11, computerMove: 22 },
}));

vi.mock("expo-audio", () => ({
  createAudioPlayer: vi.fn((source: number) => {
    const player: FakePlayer = {
      source,
      volume: 1,
      play: vi.fn(),
      seekTo: vi.fn(async () => undefined),
    };
    audio.players.push(player);
    return player;
  }),
  setAudioModeAsync: vi.fn((mode: unknown) => {
    audio.modes.push(mode);
    return Promise.resolve();
  }),
}));

import { createNativeSoundPlayer } from "./sound";

describe("native move sounds", () => {
  it("configures a mixer-safe session that respects the silent switch", () => {
    createNativeSoundPlayer();
    expect(audio.modes).toEqual([{ playsInSilentMode: false, interruptionMode: "mixWithOthers" }]);
  });

  it("reuses one player per actor and rewinds before replaying", () => {
    const player = createNativeSoundPlayer();
    player.playMove("player");
    player.playMove("player");
    player.playMove("computer");

    expect(audio.players).toHaveLength(2);
    const [human, computer] = audio.players;
    expect(human?.source).toBe(11);
    expect(computer?.source).toBe(22);
    expect(human?.seekTo).toHaveBeenCalledTimes(2);
    expect(human?.play).toHaveBeenCalledTimes(2);
    expect(computer?.seekTo).toHaveBeenCalledTimes(1);
    expect(computer?.play).toHaveBeenCalledTimes(1);
  });
});
