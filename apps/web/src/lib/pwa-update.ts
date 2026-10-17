import type { GameController } from "@tic-tac-chor/game";

export type PwaReloadResult = "requested" | "not-ready" | "save-failed" | "update-failed";

/** Activation can happen later than the click. Flush every write accepted until the actual reload. */
export async function reloadAfterLatestSave(
  controller: Pick<GameController, "whenSaved" | "getSnapshot">,
  reload: () => void,
): Promise<PwaReloadResult> {
  try {
    let pending: Promise<void>;
    do {
      pending = controller.whenSaved();
      await pending;
    } while (controller.whenSaved() !== pending);
  } catch {
    return "save-failed";
  }
  const snapshot = controller.getSnapshot();
  if (snapshot.status !== "ready") return "not-ready";
  if (snapshot.persistenceError !== null) return "save-failed";
  // No await between the final queue/error checks and reload: no new event can enqueue a save here.
  try {
    reload();
    return "requested";
  } catch {
    return "update-failed";
  }
}

/** Only called from the explicit Reload control; accepted writes must settle before activation. */
export async function requestPwaReload(
  controller: Pick<GameController, "whenSaved" | "getSnapshot">,
  activateUpdate: () => Promise<void>,
): Promise<PwaReloadResult> {
  if (controller.getSnapshot().status !== "ready") return "not-ready";
  try {
    await controller.whenSaved();
  } catch {
    return "save-failed";
  }
  if (controller.getSnapshot().persistenceError !== null) return "save-failed";
  try {
    await activateUpdate();
    return "requested";
  } catch {
    return "update-failed";
  }
}
