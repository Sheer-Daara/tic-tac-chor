/**
 * Verify the committed move sounds are valid, within budget and byte-identical
 * to a fresh deterministic render.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MOVE_SOUNDS, renderAllMoveSounds } from "./sounds.mjs";
import { moveSoundMetadata } from "../src/index.ts";

// Guard against the generator list and the shared metadata drifting apart.
assert.deepEqual(
  MOVE_SOUNDS.map(({ id }) => id),
  moveSoundMetadata.map(({ id }) => id),
);

const target = new URL("../sounds/", import.meta.url);
const MAX_BYTES = 48 * 1024;
let total = 0;
for (const { id, file, bytes } of renderAllMoveSounds()) {
  const stored = readFileSync(new URL(file, target));
  assert.equal(stored.toString("ascii", 0, 4), "RIFF", `${id} is not a RIFF file`);
  assert.equal(stored.toString("ascii", 8, 12), "WAVE", `${id} is not a WAVE file`);
  assert.deepEqual(stored, bytes, `${id} is stale; run "pnpm generate:sounds"`);
  assert.ok(bytes.length <= MAX_BYTES, `${id} exceeds the ${MAX_BYTES / 1024} KiB sound budget`);
  total += bytes.length;
}
assert.equal(MOVE_SOUNDS.length, 2);
console.log(`Verified ${MOVE_SOUNDS.length} move sounds (${(total / 1024).toFixed(1)} KiB).`);
