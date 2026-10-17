import { createInitialSnapshot, type ControllerSnapshot } from "@tic-tac-chor/game";
import { describe, expect, it, vi } from "vite-plus/test";

import { reloadAfterLatestSave, requestPwaReload } from "./pwa-update";

function snapshot(error: unknown = null): ControllerSnapshot {
  return {
    status: "ready",
    game: {
      roundId: 1,
      board: [null, null, null, null, null, null, null, null, null],
      turn: "player",
      playerMark: "X",
      outcome: { type: "in-progress" },
      backgroundIndex: 0,
      latestTaunt: null,
    },
    persisted: createInitialSnapshot(),
    persistenceError: error,
    isThinking: false,
    canPlayerMove: true,
  };
}

describe("user-requested PWA reload", () => {
  it("waits for accepted saves before requesting activation", async () => {
    let finishSave = () => {};
    const save = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const activate = vi.fn(async () => {});
    const request = requestPwaReload(
      { getSnapshot: () => snapshot(), whenSaved: () => save },
      activate,
    );
    expect(activate).not.toHaveBeenCalled();
    finishSave();
    expect(await request).toBe("requested");
    expect(activate).toHaveBeenCalledOnce();
  });

  it("keeps playing when the settled snapshot reports a failed save", async () => {
    let current = snapshot();
    const activate = vi.fn(async () => {});
    expect(
      await requestPwaReload(
        {
          getSnapshot: () => current,
          whenSaved: async () => {
            current = snapshot(new Error("Quota exceeded"));
          },
        },
        activate,
      ),
    ).toBe("save-failed");
    expect(activate).not.toHaveBeenCalled();
  });

  it("also blocks activation when an adapter flush rejects", async () => {
    const activate = vi.fn(async () => {});
    expect(
      await requestPwaReload(
        {
          getSnapshot: () => snapshot(),
          whenSaved: async () => {
            throw new Error("Storage unavailable");
          },
        },
        activate,
      ),
    ).toBe("save-failed");
    expect(activate).not.toHaveBeenCalled();
  });

  it("blocks activation before hydration", async () => {
    const activate = vi.fn(async () => {});
    const loading: ControllerSnapshot = {
      status: "loading",
      game: null,
      persisted: createInitialSnapshot(),
      persistenceError: null,
      isThinking: false,
      canPlayerMove: false,
    };
    expect(
      await requestPwaReload({ getSnapshot: () => loading, whenSaved: async () => {} }, activate),
    ).toBe("not-ready");
    expect(activate).not.toHaveBeenCalled();
  });

  it("reports activation failure without throwing out of the click handler", async () => {
    expect(
      await requestPwaReload(
        { getSnapshot: () => snapshot(), whenSaved: async () => {} },
        async () => {
          throw new Error("Worker unavailable");
        },
      ),
    ).toBe("update-failed");
  });
});

describe("reload after worker activation", () => {
  it("flushes a newer queue accepted while an earlier flush is pending", async () => {
    let finishFirst = () => {};
    let finishLatest = () => {};
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const latest = first.then(
      () =>
        new Promise<void>((resolve) => {
          finishLatest = resolve;
        }),
    );
    let pending = first;
    const reload = vi.fn();
    const request = reloadAfterLatestSave(
      { getSnapshot: () => snapshot(), whenSaved: () => pending },
      reload,
    );
    pending = latest;
    finishFirst();
    await first;
    expect(reload).not.toHaveBeenCalled();
    finishLatest();
    expect(await request).toBe("requested");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("blocks reload if a newer save fails after activation", async () => {
    let finishFirst = () => {};
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    let current = snapshot();
    const latest = first.then(() => {
      current = snapshot(new Error("Quota exceeded"));
    });
    let pending = first;
    const reload = vi.fn();
    const request = reloadAfterLatestSave(
      { getSnapshot: () => current, whenSaved: () => pending },
      reload,
    );
    pending = latest;
    finishFirst();
    expect(await request).toBe("save-failed");
    expect(reload).not.toHaveBeenCalled();
  });

  it("checks latest persistence state even when an activated worker needs no further activation", async () => {
    const pending = Promise.resolve();
    const reload = vi.fn();
    expect(
      await reloadAfterLatestSave(
        { getSnapshot: () => snapshot(new Error("Read failed")), whenSaved: () => pending },
        reload,
      ),
    ).toBe("save-failed");
    expect(reload).not.toHaveBeenCalled();
  });
});
