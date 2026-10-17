/** Regenerate the procedural move sounds under `sounds/`. */
import { mkdirSync, writeFileSync } from "node:fs";

import { renderAllMoveSounds } from "./sounds.mjs";

const target = new URL("../sounds/", import.meta.url);
mkdirSync(target, { recursive: true });
for (const { file, bytes } of renderAllMoveSounds()) {
  writeFileSync(new URL(file, target), bytes);
  console.log(`Wrote sounds/${file} (${bytes.length} bytes).`);
}
