import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { BACKGROUND_COUNT, backgroundMetadata, opponentMetadata } from "../src/index.ts";

const manifest = JSON.parse(
  readFileSync(new URL("../images/manifest.json", import.meta.url), "utf8"),
);
const ids = [opponentMetadata.id, ...backgroundMetadata.map(({ id }) => id)];
assert.equal(BACKGROUND_COUNT, 5);
assert.equal(new Set(ids).size, 6);
assert.equal(manifest.length, ids.length);
let totalBytes = 0;
for (const id of ids) {
  const asset = manifest.find((entry) => entry.id === id);
  assert.ok(asset, `Missing artwork: ${id}`);
  const bytes = readFileSync(new URL(`../images/${asset.file}`, import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  assert.equal(bytes.length, asset.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  assert.ok(bytes.length <= 256 * 1024, `${id} exceeds the mobile asset budget`);
  assert.equal(asset.width, id === opponentMetadata.id ? 512 : 768);
  assert.equal(asset.height, asset.width);
  assert.equal(asset.hasAlpha, id === opponentMetadata.id);
  totalBytes += bytes.length;
}
assert.ok(totalBytes <= 1536 * 1024, "Bundled artwork exceeds 1.5 MiB");
console.log(`Verified six bundled WebP images (${(totalBytes / 1024).toFixed(1)} KiB).`);
