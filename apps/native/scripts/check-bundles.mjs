import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = path.resolve(appRoot, "../..");
const artworkRoot = path.resolve(appRoot, "../../packages/assets/images");
const artwork = readdirSync(artworkRoot).filter((name) => name.endsWith(".webp"));
const soundRoot = path.resolve(appRoot, "../../packages/assets/sounds");
const sounds = readdirSync(soundRoot).filter((name) => name.endsWith(".wav"));
const requiredSources = [
  "/apps/native/app/_layout.tsx",
  "/apps/native/app/index.tsx",
  "/apps/native/app/modal.tsx",
  "/apps/native/components/game-screen.tsx",
  "/apps/native/components/game-preferences.tsx",
  "/apps/native/components/game-provider.tsx",
  "/apps/native/components/board-backdrop.tsx",
  "/apps/native/lib/use-reduced-motion.ts",
  "/apps/native/lib/persistence.ts",
  "/apps/native/lib/sound.ts",
  "/apps/native/lib/theme-preference.ts",
  "/packages/game/src/controller.ts",
  "/packages/game/src/engine.ts",
  "/packages/game/src/taunts.ts",
  "/packages/game/src/presentation.ts",
  "/packages/assets/src/native.ts",
  "/packages/design/src/tokens.ts",
];

for (const platform of ["ios", "android"]) {
  const output = path.join(appRoot, ".cache", `bundle-${platform}`);
  const metadata = JSON.parse(readFileSync(path.join(output, "metadata.json"), "utf8"));
  const bundle = metadata.fileMetadata[platform];
  assert.equal(path.extname(bundle.bundle), ".hbc", `${platform}: expected Hermes bytecode`);
  const bytecode = readFileSync(path.join(output, bundle.bundle));
  assert(bytecode.length > 0, `${platform}: empty bundle`);

  const sourceMap = JSON.parse(readFileSync(path.join(output, `${bundle.bundle}.map`), "utf8"));
  for (const expected of requiredSources) {
    const sourceIndex = sourceMap.sources.findIndex((source) => source.endsWith(expected));
    assert(sourceIndex >= 0, `${platform}: missing actual application module ${expected}`);
    assert.equal(
      sourceMap.sourcesContent[sourceIndex],
      readFileSync(path.join(repositoryRoot, expected.slice(1)), "utf8"),
      `${platform}: bundle is stale for ${expected}; export it again`,
    );
  }
  assert(
    !sourceMap.sources.some((source) => source.includes("/apps/native/app/(drawer)/")),
    `${platform}: starter routes remain bundled`,
  );
  const reactVersions = new Set(
    sourceMap.sources.flatMap((source) => {
      const version = source.match(/\/\.pnpm\/react@([^/]+)\/node_modules\/react\//);
      return version ? [version[1]] : [];
    }),
  );
  assert.equal(reactVersions.size, 1, `${platform}: expected one React runtime`);

  const exportedArtwork = bundle.assets
    .filter((asset) => asset.ext === "webp")
    .map((asset) => readFileSync(path.join(output, asset.path)));
  for (const name of artwork) {
    const original = readFileSync(path.join(artworkRoot, name));
    assert(
      exportedArtwork.some((image) => image.equals(original)),
      `${platform}: missing or altered bundled artwork ${name}`,
    );
  }
  const exportedSounds = bundle.assets
    .filter((asset) => asset.ext === "wav")
    .map((asset) => readFileSync(path.join(output, asset.path)));
  for (const name of sounds) {
    const original = readFileSync(path.join(soundRoot, name));
    assert(
      exportedSounds.some((audio) => audio.equals(original)),
      `${platform}: missing or altered bundled sound ${name}`,
    );
  }
  for (const asset of bundle.assets) {
    assert(statSync(path.join(output, asset.path)).isFile(), `${platform}: missing ${asset.path}`);
  }
  console.log(
    `${platform}: ${bytecode.length} bytes of Hermes bytecode; all ${artwork.length} shared images and ${sounds.length} move sounds intact; application modules and React ${[...reactVersions][0]} verified.`,
  );
}
