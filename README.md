# Tic-Tac-Chor

A mobile-first tic-tac-toe game for the web and Expo. Play against a Narendra Modi editorial caricature, with sample Hinglish banter and five minimal, mischievous Modi caricature backdrops that change with each new game. Dialogue is authored satire.

The opener is chosen randomly and plays X. The computer uses legal minimax moves and thinks for about 1.2 seconds. New game abandons the current round without counting a result; completed rounds count once. Settings provides Light, Dark and System appearance plus confirmed statistics reset.

## Development

Use the pnpm version pinned in `package.json` and Node 24 or newer. Install from the workspace root:

```bash
pnpm install
pnpm run dev:web
```

Open [localhost:3001](http://localhost:3001). The web app uses React 19, TanStack Router, Tailwind 4, shadcn/Base UI and Vite+. `pnpm run dev` also starts the infrastructure development workflow; `dev:web` runs the frontend directly.

### iOS and Android

The Expo SDK 57 app retains Unistyles and requires a **development build**. Expo Go does not contain the [Unistyles native module](https://unistyl.es/v3/start/getting-started/).

With full Xcode and an iOS simulator installed, or Android Studio/SDK, Java and an emulator/device installed:

```bash
pnpm --filter native ios
# or
pnpm --filter native android
```

These commands generate the ignored native projects, compile and install the development client, and launch Metro. For later JavaScript-only changes, start Metro with:

```bash
pnpm --filter native dev
```

Rebuild after native dependencies or app configuration change. The game and Settings share the same controller across routes, so opening or dismissing Settings preserves the round. Native artwork and storage are bundled/private; gameplay needs no server.

EAS development profiles live in `apps/native/eas.json`. Optional cloud development builds require your own Expo login/project and platform signing setup; this repository is not linked to an EAS project. Run EAS commands from `apps/native`. Deployment and store submission are outside the implementation plan.

### Checks and production preview

```bash
pnpm run check
pnpm --filter @tic-tac-chor/game --filter @tic-tac-chor/design --filter web --filter native test
pnpm --filter web build
pnpm --filter web serve
pnpm --filter native bundle:ios
pnpm --filter native bundle:android
pnpm --filter native bundle:check
```

`check` runs workspace formatting/lint, TypeScript, design CSS provenance, artwork integrity checks and the web/PWA build. Native bundle checks and remaining live acceptance procedures are documented in [the verification guide](docs/plan/verification.md). Unit tests and bundles do not replace simulator/device checks.

The production web preview includes the service worker. After its offline-ready notice, install through the browser's app menu or Add to Home Screen. Production hosting needs HTTPS. Updates offer Reload or Not now; Reload waits for local saves and starts a fresh round. Another tab accepting an update does not reload your active game.

## Shared packages

- `packages/game`: rules, exhaustive minimax opponent, taunts, carousel, validated snapshot and serialized controller. `/react` exports the React binding; `/presentation` exports shared turn text and descriptive board labels. Platform storage, timers and the optional move-cue player are injected.
- `packages/design`: light/dark colors, geometry, typography and motion. Web CSS is generated from the same tokens consumed by native Unistyles.
- `packages/assets`: artwork, procedurally generated move sounds and ordered metadata, with explicit Vite imports through `/web` and literal Metro references through `/native`.
- `packages/ui`: shared web shadcn/Base UI primitives.
- `packages/config`: shared TypeScript configuration.
- `packages/infra`: existing Alchemy/Cloudflare web infrastructure.

The apps use platform UI components with the same board/opponent/message/score composition. Native module dependencies belong in `apps/native`; keep web React dependency resolution separate from native's pinned React version.

## Local data

There are no accounts, database, cloud sync or individual game history. Each browser/device keeps aggregate wins/losses/draws, theme preference, move-sound preference and the last background position in one validated version-1 JSON snapshot.

Web uses `localStorage` key `tic-tac-chor:snapshot:v1`. Native uses `tic-tac-chor/snapshot-v1.json` in Expo's private document directory, staging writes and retaining one valid backup. Reload/relaunch advances to a fresh round and keeps results/preferences. Reset statistics clears only totals. Invalid snapshots recover to defaults; storage failures show a Retry save notice while play continues. Clearing browser/app data removes local results; devices do not share data.

## Change personality and artwork

Edit `sampleTaunts` in `packages/game/src/taunts.ts`. The opening, player-move, computer-move, computer-win and draw arrays are shared by both apps. Keep a nonempty fallback; empty categories remain supported. The controller avoids immediately repeating the previous message.

Background order comes from `backgroundMetadata` in `packages/assets/src/index.ts`. Reorder this array to change both carousels. To replace a background, keep its filename/dimensions and update the image integrity manifest. To add/remove artwork, update both explicit platform registries and manifest entries; the controller derives the carousel count from shared metadata. See [artwork maintenance](packages/assets/README.md) for dimensions, budgets and provenance. Changing an existing saved carousel's order/count changes how its stored index maps to the artwork.

## Change move sounds

The two cues are synthesised from scratch, so they carry no third-party licensing: your move rises (E5 → B5) and the computer's falls (B3 → F#3). Edit the envelopes, notes and timbres in `packages/assets/scripts/sounds.mjs`, then regenerate and verify the checked-in WAVs:

```bash
pnpm --filter @tic-tac-chor/assets generate:sounds
pnpm --filter @tic-tac-chor/assets check:sounds
```

The shared controller plays a cue for every accepted move and skips it while sound is off; the Settings panel persists that choice. Web playback is best-effort through preloaded `HTMLAudioElement`s, and native playback uses one reusable `expo-audio` player per actor. Both are adapters injected into `createGameController`, so the game core stays platform-free. Adding or renaming sounds also means updating both platform registries in `packages/assets/src`.

Change visual tokens in `packages/design/src/tokens.ts`, then regenerate and verify:

```bash
pnpm --filter @tic-tac-chor/design generate:css
pnpm --filter @tic-tac-chor/design check-types
pnpm --filter @tic-tac-chor/design test
```

Use [shared design guidance](packages/design/README.md) to preserve contrast and reduced-motion handling. Two type voices come from the tokens: **Fraunces** (`fontFamily`) for everything structural and **Baloo 2** (`funFontFamily`) for the opponent's dialogue and win celebrations. Web loads both from the `@fontsource-variable` npm packages in `apps/web/src/index.css`; the Latin subsets are declared by hand so the other subsets are not precached. The game's X and O are drawn SVG paths in `apps/web/src/components/marks.tsx` and reused by the logo, the board and the scoreboard legend. Add web primitives through shadcn:

```bash
pnpm dlx shadcn@latest add <component> -c packages/ui
```

## Environment

Each app owns `.env.schema`. Varlock generates typed accessors during installation; run `pnpm run env:generate` after schema changes. Keep secrets in ignored env files. The game has no API or database dependency.

## Deploy to Cloudflare Workers

The web app deploys as a Cloudflare Worker with static assets. The infrastructure is declared in `packages/infra/alchemy.run.ts` with [Alchemy](https://alchemy.run) (`Cloudflare.Website.Vite`), which runs the Vite build and uploads the result. There is no `wrangler.toml` to edit; Alchemy manages the Worker.

### One-time Cloudflare setup

Run this in a **real terminal** (Terminal.app or iTerm), not from inside pi or another agent session:

```bash
pnpm run auth
```

That runs `alchemy profile edit --add Cloudflare`. Choose **OAuth** → **All Scopes**, then finish the browser login and pick your account. Credentials are stored in the `default` profile under `~/.alchemy` and refresh automatically.

> **Agent sessions block Alchemy's TUI.** Alchemy treats a process as non-interactive when `AI_AGENT` is set or `PATH` contains `.pi/agent` (plus various other agent/CI markers), and then fails with `failed to configure credentials` / `Cannot run selection without an interactive terminal`. The `auth`, `deploy` and `destroy` scripts set `ALCHEMY_TUI=1` to override that detection; it is a no-op when there is no real TTY. If you invoke `alchemy` directly, prefix it yourself: `ALCHEMY_TUI=1 pnpm exec alchemy profile edit --add Cloudflare`.

**No browser, or CI?** Skip the profile entirely and pass credentials through the environment. Both `deploy` and the deploy-time state-store bootstrap use them:

```bash
export CLOUDFLARE_ACCOUNT_ID=<32-hex account id>
export CLOUDFLARE_API_TOKEN=<scoped api token>
pnpm run deploy:prod
```

`pnpm exec alchemy provider cloudflare token` creates a scoped token, and `pnpm exec alchemy provider check-env` confirms the variables are seen. To persist stored credentials without the TUI instead:

```bash
cd packages/infra
pnpm exec alchemy profile edit --add Cloudflare --method stored \
  --set accountId=<32-hex account id> --set apiToken=env:CLOUDFLARE_API_TOKEN
```

No secrets are required at runtime and no `.env` is needed. Alchemy keeps deployment state in a Cloudflare-hosted state store it bootstraps automatically on the first deploy.

### Deploy

```bash
pnpm run deploy:prod   # deploy to the explicit `production` stage
pnpm run deploy        # deploy to the live_$USER stage (default)
```

Alchemy prints the deployed `web` URL (also recorded in `packages/infra/.alchemy/state/tic-tac-chor/<stage>/__stack_output__.json`) and serves it on `https://<worker>.<account-subdomain>.workers.dev`. Attach a custom domain by adding a `routes` entry to the `Cloudflare.Website.Vite` call in `packages/infra/alchemy.run.ts`.

To tear the stack down again:

```bash
pnpm run destroy:prod
pnpm run destroy
```

### Deploy from CI

Pushes to `main` deploy automatically to the `production` stage through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). You can also start a deploy manually from the workflow's **Run workflow** button.

Configure these repository settings before the first run:

- Repository variable `CLOUDFLARE_ACCOUNT_ID`: your 32-character Cloudflare account ID.
- Repository secret `CLOUDFLARE_API_TOKEN`: a scoped API token. `pnpm exec alchemy provider cloudflare token` creates one from your local authenticated profile.

The workflow runs `alchemy deploy --stage production --yes` with those environment variables. CI is non-interactive, so `--yes` is required; without it Alchemy prints the plan and exits without applying it. Alchemy stores deployment state in Cloudflare, so no state files or additional secrets are needed.

The agreed product decisions, progress and remaining acceptance checks live in [docs/plan](docs/plan/README.md) and [the checklist](docs/plan/checklist.md). The shared engine now allows a single 70% chance to steal an otherwise drawn round on the computer's final scheduled turn; see [the game engine documentation](packages/game/README.md) for the current policy.
