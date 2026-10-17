import { parseSnapshot, serializeSnapshot, type PersistenceAdapter } from "@tic-tac-chor/game";

export const SNAPSHOT_STORAGE_KEY = "tic-tac-chor:snapshot:v1";

export interface BrowserPersistenceOptions {
  /** Deferred until load/save so server imports and denied storage remain safe. */
  readonly getStorage?: () => Pick<Storage, "getItem" | "setItem">;
}

export function createBrowserPersistenceAdapter({
  getStorage = () => window.localStorage,
}: BrowserPersistenceOptions = {}): PersistenceAdapter {
  return {
    async load() {
      return parseSnapshot(getStorage().getItem(SNAPSHOT_STORAGE_KEY));
    },
    async save(snapshot) {
      // Validate before accessing storage; never persist an unusable snapshot.
      const json = serializeSnapshot(snapshot);
      getStorage().setItem(SNAPSHOT_STORAGE_KEY, json);
    },
  };
}
