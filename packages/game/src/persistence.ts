import { BACKGROUND_COUNT } from "@tic-tac-chor/assets";
import type { PersistedSnapshot } from "./contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Decode the supported schema and copy only persisted fields, excluding round/history data. */
export function decodeSnapshot(value: unknown): PersistedSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.stats)) return null;
  const { wins, losses, draws } = value.stats;
  const { theme, soundEnabled, lastBackgroundIndex } = value;
  if (!isCount(wins) || !isCount(losses) || !isCount(draws)) return null;
  if (theme !== "light" && theme !== "dark" && theme !== "system") return null;
  // Older saves predate sound and were always audible, so a missing value defaults on.
  if (soundEnabled !== undefined && typeof soundEnabled !== "boolean") return null;
  if (
    lastBackgroundIndex !== null &&
    (!isCount(lastBackgroundIndex) || lastBackgroundIndex > BACKGROUND_COUNT)
  ) {
    return null;
  }
  return {
    version: 1,
    stats: { wins, losses, draws },
    theme,
    soundEnabled: soundEnabled ?? true,
    // The previous six-image carousel could save index 5. Keep its scores and
    // preferences, mapping that retired position to the end of the new set.
    lastBackgroundIndex:
      lastBackgroundIndex === BACKGROUND_COUNT ? BACKGROUND_COUNT - 1 : lastBackgroundIndex,
  };
}

/** Missing, malformed, or unsupported saves use the same fresh-install fallback. */
export function parseSnapshot(json: string | null): PersistedSnapshot | null {
  if (json === null) return null;
  try {
    return decodeSnapshot(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Reject invalid writes and never serialize extraneous runtime state. */
export function serializeSnapshot(snapshot: PersistedSnapshot): string {
  const validated = decodeSnapshot(snapshot);
  if (validated === null) throw new TypeError("Invalid persisted game snapshot");
  return JSON.stringify(validated);
}
