import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createBrowserSoundPlayer } from "./sound";

class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  preload = "";
  volume = 1;
  readyState = 1;
  play = vi.fn(async () => undefined);

  constructor(public readonly src: string) {
    FakeAudio.instances.push(this);
  }
}

afterEach(() => {
  FakeAudio.instances = [];
  vi.unstubAllGlobals();
});

describe("browser move sounds", () => {
  it("preloads one element per actor and rewinds before replaying", () => {
    vi.stubGlobal("Audio", FakeAudio);
    const player = createBrowserSoundPlayer();
    expect(FakeAudio.instances).toHaveLength(2);

    player.playMove("player");
    player.playMove("player");
    player.playMove("computer");

    const [human, computer] = FakeAudio.instances;
    expect(human?.play).toHaveBeenCalledTimes(2);
    expect(computer?.play).toHaveBeenCalledTimes(1);
    expect(computer?.currentTime).toBe(0);
  });

  it("stays silent and defensive when the Web Audio element is unavailable", () => {
    vi.stubGlobal("Audio", undefined);
    const player = createBrowserSoundPlayer();
    expect(() => player.playMove("player")).not.toThrow();
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("swallows rejected playback promises", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const player = createBrowserSoundPlayer();
    FakeAudio.instances[0]?.play.mockRejectedValueOnce(new Error("blocked"));
    expect(() => player.playMove("player")).not.toThrow();
    await Promise.resolve();
  });
});
