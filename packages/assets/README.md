# Shared bundled artwork

`@tic-tac-chor/assets` exports shared metadata, `BACKGROUND_COUNT` and the registry constructor without loading images or platform APIs. The ordered `backgroundMetadata` array controls the carousel on both platforms.

- `@tic-tac-chor/assets/web` exports `webAssets` with six explicit Vite WebP imports.
- `@tic-tac-chor/assets/native` exports `nativeAssets` with six literal Metro `require` references to the same files.

Artwork lives in `images/`: a transparent 512×512 Narendra Modi opponent avatar and five opaque 768×768 minimal caricature backdrops. The carousel progresses through Knowing Smirk, Playful Wink, Side Eye, Secret Grin and Scheming Chin. Quiet ivory backgrounds and simple outlines keep the artwork readable beneath the board overlay. Everything is bundled for offline play.

The built-in imagegen tool generated the replacement backdrops on 2026-10-17. Exact prompts and generation dates are recorded in [artwork-prompts.json](./artwork-prompts.json). Each prompt asks for one minimal Narendra Modi bust with a distinct mischievous expression, sparse editorial cartoon lines, neutral colors, and no text or scenery. Originals were visually inspected, then resized to 768×768 and encoded as WebP at quality 82. The existing opponent avatar is retained.

`images/manifest.json` records dimensions, transparency, byte sizes and SHA-256 hashes from the decoded optimized images. `pnpm --filter @tic-tac-chor/assets check:assets` verifies file integrity, registry coverage and mobile budgets (256 KiB per image, 1.5 MiB combined). `check-types` runs this check as well.

To replace artwork, keep the existing filenames and square dimensions, preserve opponent transparency, optimize the new files and update their manifest entries after decoding/inspection. To reorder backgrounds, edit only `backgroundMetadata` in `src/index.ts`. To add or remove one, also update both explicit registries, their source record, and the count/budget validation; the engine derives its loop length from the shared metadata.

Reusable `BoardBackdrop` components live in the web/native apps. They mount all five backgrounds, wait for replacements to load, crossfade over 240 ms and honor reduced motion. Mount the component first inside a positioned board container, then place opaque grid lines, X/O marks and text above it. Its stable overlay uses the shared design palette to guarantee contrast throughout transitions. Game screens integrate these components in Steps 5/6; offline installation/device testing remains Step 7. The web service-worker glob includes WebP so these files will be precached when the screens import the registry.
