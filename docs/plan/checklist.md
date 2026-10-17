# Implementation checklist

Source of truth: [the agreed plan](./README.md).

## Agent tracking instructions

- Work through the phases below, checking off tasks only after implementation and relevant verification are complete.
- Update this checklist as work progresses. Record blockers, deviations and verification evidence in the progress log at the bottom.
- Leave blocked or unverified items unchecked. Record what remains and the next concrete action; do not treat a build alone as proof of device or accessibility testing.
- Preserve pre-existing workspace changes, including the pnpm migration. Deployment and app-store submission are outside the plan.
- Planning-time checks passed for the starter apps; rerun checks against the completed implementation before marking validation complete.

## 1. Workspace and shared contracts

- [x] Review applicable repository and skill instructions and confirm the current dependency/configuration baseline.
- [x] Add the game, design and assets workspace packages with exports, TypeScript configuration and workspace dependencies in both apps.
- [x] Define shared game state, statistics, theme preference, taunt configuration and asynchronous persistence contracts.
- [x] Keep platform APIs in app adapters and the core game logic independent of React and platform runtimes.
- [x] Expose the shared React controller through a separate package entry point, with injectable storage and randomness.

## 2. Game engine and opponent

- [x] Implement legal moves, alternating turns, all winning lines, draws and terminal board locking.
- [x] Randomly choose the opener per round, assign X to the opener and expose the correct player/opponent mark labels.
- [x] Implement minimax and random selection among equally optimal computer moves.
- [x] Add approximately 1.2-second thinking feedback and reject player input during computer turns.
- [x] Cancel obsolete computer callbacks on restart/unmount and prevent duplicate moves from rapid input.
- [x] Implement New Game and count each completed round exactly once; do not count abandoned rounds.

## 3. Taunts, artwork and design tokens

- [x] Add editable opening, player-move, computer-move, computer-win and draw taunt arrays with sample Hinglish copy.
- [x] Implement contextual taunt selection, immediate-repeat avoidance and empty-category fallback.
- [x] Generate and inspect the Narendra Modi editorial caricature and six civic background illustrations using the imagegen skill.
- [x] Save optimized artwork in the shared assets package and provide explicit Vite imports and Metro static references.
- [x] Implement the ordered background loop, advancement on each new round and short crossfade.
- [x] Define shared light/dark tokens and generate web CSS variables from the same source consumed by native Unistyles.
- [x] Establish readable board overlays, grid lines and contrasting X/O marks across every background and theme.

## 4. Persistence and preferences

- [x] Define and validate a versioned snapshot containing aggregate results, theme preference and last background position.
- [x] Implement the browser localStorage adapter.
- [x] Implement the native app-private JSON document adapter using Expo FileSystem.
- [x] Hydrate saved data before initializing the round and serialize save operations.
- [x] Handle missing/malformed data and save failures without preventing play; display a small save-failure notice.
- [x] Persist statistics and preferences across reload/relaunch while starting a fresh round.
- [x] Add confirmed statistics reset without clearing theme preference or background progression.
- [x] Support System as the default theme, live system appearance changes and persisted Light/Dark overrides.

## 5. Web app and PWA

- [x] Replace the starter screen/header with the game screen, opponent identity, turn status and board.
- [x] Add the latest-message-only panel directly below the board, statistics totals and New Game control.
- [x] Add the settings panel with theme selection and confirmed statistics reset.
- [x] Make the layout work on small phones and larger screens, with safe-area handling and no horizontal overflow.
- [x] Implement keyboard interaction, descriptive cell labels, visible focus, status announcements and reduced-motion behavior.
- [x] Keep TanStack Router devtools development-only.
- [x] Complete app metadata, PWA manifest, install icons and standalone presentation.
- [x] Precache application files, fonts and every bundled image format.
- [x] Add user-controlled PWA updates that do not interrupt active games.

## 6. Expo app

- [x] Replace starter drawer/tab/demo routes with the game screen and compact settings UI.
- [x] Integrate the same game controller, taunt config, assets and statistics behavior used on web.
- [x] Match the web composition and design tokens using React Native and Unistyles.
- [x] Render bundled artwork and transitions, installing any Expo dependencies with SDK-compatible versions.
- [x] Apply safe-area layout, accessible labels/announcements, larger-text support and reduced-motion behavior.
- [x] Integrate persistent theme overrides with Unistyles and native system/status-bar appearance.
- [ ] Configure and verify development builds for iOS and Android while retaining Unistyles.

## 7. Automated and device verification

- [x] Test every winning line, draws, occupied cells, wrong turns and moves after a terminal result.
- [x] Exhaustively test human move paths and optimal computer responses with either opener, including all optimal tie choices, proving the computer cannot lose.
- [x] Test restarting while the computer is thinking, stale callbacks, rapid input and duplicate result counting.
- [x] Test taunt categories, fallback behavior, immediate-repeat avoidance and latest-message replacement.
- [x] Test carousel advancement/wraparound and persistence of background progression.
- [x] Test persistence hydration, reload/relaunch, corrupted snapshots, save failures and confirmed statistics reset.
- [x] Run workspace lint and TypeScript checks successfully.
- [x] Run the web production build successfully and inspect its generated manifest and service-worker precache.
- [ ] Run native bundle and development-build checks for both platforms.
- [ ] Verify an installed production PWA reloads offline and completes multiple games with every background available.
- [ ] Verify functional parity on web, iOS and Android, including computer-first rounds and statistics persistence.
- [ ] Verify Light/Dark/System behavior and persisted overrides on all platforms.
- [ ] Verify small-screen layouts, larger text, touch targets, screen readers, web keyboard navigation and reduced motion.

## 8. Documentation and handoff

- [x] Update the project README with app usage, development commands, package architecture and local data behavior.
- [x] Document where and how the user replaces sample taunts and adds/reorders bundled backgrounds.
- [x] Correct the Expo Go guidance and document the required Unistyles development-build workflow.
- [x] Record final verification evidence and any remaining limitations in the progress log.
- [x] Review the final diff for unintended changes and confirm implementation and available checks are complete, recording unverified device acceptance.

## Progress log

### Initial state

- Plan and checklist saved; implementation has not started.
- Starter checks during planning: native TypeScript passed; web build and TypeScript passed; service worker generated successfully.
- Preserve existing changes to README, Better-T-Stack configuration, root/infra manifests, Bun lock/config removal and new pnpm workspace/lock files.

### Implementation updates

Append dated entries with completed work, verification commands/results, blockers or deviations, and the next concrete action.

### 2026-10-10 — Step 1 completed

- Added `@tic-tac-chor/game`, `@tic-tac-chor/design` and `@tic-tac-chor/assets` with source exports, isolated TypeScript checks, package documentation and dependencies in both apps. Updated the pnpm lockfile and restored the workspace install with scripts disabled.
- Defined fixed-size board/cell types, actors distinct from X/O marks, outcomes, game state, statistics, editable taunt contracts, theme preference, version-1 saved snapshot and asynchronous storage/randomness contracts.
- Added a pure external game controller with injected engine operations, storage and randomness. The React hook lives in `@tic-tac-chor/game/react`; root imports do not load React or platform APIs. Controller hydration precedes round creation and supports load-error recovery and stale-load cleanup.
- Design and asset packages expose contracts only. Final token values, artwork, concrete platform asset registries, game rules, AI scheduling and persistence writes/adapters remain in later steps. No platform storage implementation was added to the core.
- Delegated game-package implementation and an independent read-only architecture/code review to subagents. The review found no actionable defects.
- **Passed:** `pnpm run check` — workspace formatting/lint checks, all workspace TypeScript checks (including game tests), and web production/PWA build. Existing starter warnings remain: three unused native imports/parameters and the web bundle-size warning; the checks exited successfully.
- **Passed:** `pnpm --filter @tic-tac-chor/game test` — six controller tests covering dependency injection, hydration ordering, missing data, read failures, stale cleanup/StrictMode-style activation, multiple consumers and subscriptions/inactive actions.
- **Passed:** temporary app-local TypeScript consumer checks and a Vite library bundle importing shared core/React/design/assets exports. The web bundle used one React runtime (19.3.0, resolved by the existing web dependency range).
- **Passed:** Expo CLI `export:embed` shared-package probes for iOS and Android. Both source maps confirmed the shared exports resolved and used only native React 19.2.3. Probes ran offline with telemetry disabled and were removed afterward. These are package-resolution checks, not simulator/device acceptance tests.
- Next action: implement Step 2, supplying concrete game-engine rules/minimax and computer-turn scheduling to the established contracts/controller.

### 2026-10-10 — Step 2 completed

- Implemented immutable rules for legal moves, all eight winning lines, draws, alternating turns and terminal board locking. Each round randomly chooses its opener and assigns X to that actor; shared helpers expose both actors' marks.
- Added minimax with random selection among all equally optimal moves. An independent test oracle checks the exact optimal move sets across all 5,478 reachable boards for each player mark. Exhaustive paths include every legal human move and every optimal computer response for both openers, proving the computer cannot lose.
- Added an injected scheduler and a 1,200 ms computer delay. The shared controller exposes atomic `isThinking`/`canPlayerMove` feedback, rejects player input during computer turns and cancels obsolete callbacks on restart or final consumer cleanup. Identity guards also reject late/repeated callbacks and rapid/reentrant input.
- New Game resets the round with a freshly selected opener and retains aggregate results. Completed rounds update wins/losses/draws exactly once in memory; abandoned rounds remain uncounted. Persistence writes/adapters remain Step 4, and visible thinking feedback and mark labels are integrated into screens in Steps 5/6.
- Delegated engine implementation and an independent read-only review to subagents. The review found no actionable defects.
- **Passed:** `pnpm --filter @tic-tac-chor/game test` — 32 tests across engine, gameplay controller and hydration/lifecycle suites. Coverage includes both openers, every winning line, invalid/terminal moves, exhaustive AI checks, the 1,199/1,200 ms boundary, restart/unmount/reactivation, rapid input, obsolete callbacks and all three result counters.
- **Passed:** game production/test TypeScript checks, `pnpm exec vp check packages/game`, and `pnpm run check-types` across the workspace, including the web production/PWA build. Existing starter warnings remain: three unused native imports/parameters and the web bundle-size warning. `pnpm exec vp lint` and `git diff --check` also passed.
- **Passed:** temporary app-local TypeScript consumer checks, a Vite shared-package library bundle, and offline Expo CLI `export:embed` probes for iOS and Android. The probes resolved the concrete engine, controller and React bridge; source/module checks confirmed one React version per app (web 19.3.0, native 19.2.3). Temporary probes were removed. These checks verify package integration, not simulator/device gameplay.
- **Verification limitation:** root `pnpm run check` stops on formatting in the pre-existing `packages/infra/alchemy.run.ts` change. That user change was preserved; scoped formatting, workspace lint, TypeScript and build checks were run separately and passed.
- Next action: implement Step 3 taunts, shared artwork, background progression and design tokens.

### 2026-10-10 — Step 3 completed

- Added editable sample Hinglish copy in `packages/game/src/taunts.ts` for all five categories. Selection skips blanks/duplicates, avoids the latest line across categories and rounds, supplies nonempty fallback copy, and gives terminal outcomes precedence. Only the latest message is retained; rejected moves preserve it.
- Shared metadata now defines the six-background sequence. The engine advances on round creation, wraps after the sixth image and recovers invalid saved positions. Moves keep the image stationary. The controller updates `lastBackgroundIndex` in its in-memory snapshot; writes and reload/relaunch persistence remain Step 4.
- Used the imagegen skill and built-in tool to generate and visually inspect a recognizable Narendra Modi editorial caricature plus Town Hall, Metro Plaza, Public Garden, Library Steps, River Walk and Market Square illustrations. Saved seven optimized WebP files in `packages/assets/images/` (778.3 KiB combined), preserving real opponent transparency at 512×512 and using opaque square 768×768 backgrounds. Exact prompts/settings are in `packages/assets/artwork-prompts.json`; dimensions, alpha flags, budgets and hashes are tracked by the asset manifest/check. Existing root `images/` files were preserved.
- Added concrete explicit Vite imports and literal Metro references to the same files, with metadata/order shared through a platform-free root export. Extended the web service-worker glob to include WebP; artwork enters the actual app precache when game screens import it in Step 5.
- Added reusable web/native `BoardBackdrop` components with load guards, 240 ms crossfades, rapid-change cleanup, decorative accessibility handling and reduced-motion support. These components are ready for the game screens in Steps 5/6. Their overlay remains above every image layer throughout transitions.
- Added shared warm light/charcoal dark tokens, teal/coral marks, typography, geometry, 44px targets and motion. Generated CSS overrides the web UI palette from the same source used by native Unistyles. A provenance check rejects stale generated CSS. Worst-case contrast across arbitrary image pixels is at least 3.74:1 for grid lines, 4.59:1 for marks and 4.81:1 for board text in either theme.
- Delegated game personality/progression, design tokens and platform backdrops to subagents. An independent read-only review found no functional defects; its documentation-location correction was applied.
- **Passed:** `pnpm --filter @tic-tac-chor/game test` — 46 tests, including exhaustive AI verification and new taunt category/fallback/repeat/latest-message/carousel tests. `pnpm --filter @tic-tac-chor/design test` — seven contrast/mapping/generation tests.
- **Passed:** `pnpm run check-types` across all packages/apps, including production/test TypeScript, CSS provenance, seven-image integrity/budget validation and the web production/PWA build. Scoped formatting/lint on all changed Step 3 files, workspace `pnpm exec vp lint` and `git diff --check` also passed. Existing native unused-variable and web bundle-size warnings remain.
- **Passed:** a production Vite preview bundle plus offline Expo CLI `export:embed` probes for iOS and Android. Each emitted all seven optimized images byte-for-byte; native source maps resolved the assets, tokens, taunts and backdrop with React 19.2.3 only. Temporary probes were removed afterward. These are bundle checks, not simulator/device acceptance tests.
- **Passed:** browser verification at 390×844 of loaded artwork, next-background selection, an active 240 ms crossfade, rapid progression/wraparound and stable overlay. Inspected all twelve light/dark background boards, confirmed the compiled reduced-motion CSS rule and found no browser errors/warnings. Saved [mobile board preview](./step3-mobile-board.jpg) and [all background/palette combinations](./step3-board-palettes.jpg). These are component verification previews, not completed game screens. Live native accessibility/animation checks remain Step 7.
- **Verification limitation:** `pnpm run check` still stops solely on formatting in the pre-existing `packages/infra/alchemy.run.ts` change. That change was preserved; scoped formatting, workspace lint, type checks and builds passed separately.
- Next action: implement Step 4 validated persistence adapters, serialized saves, statistics reset and theme preferences.

### 2026-10-10 — Step 4 completed

- Added the shared version-1 codec with strict validation of totals, theme and bundled background position. Unknown fields are stripped; invalid JSON, versions and values recover to defaults. Results saturate at the safe-integer boundary to keep every accepted snapshot writable.
- Implemented the lazy browser localStorage adapter at `tic-tac-chor:snapshot:v1`, preserving unrelated browser data. Implemented a private Expo FileSystem JSON adapter with staged replacement, one last-valid backup and recovery from a missing/malformed main file. Installed SDK-compatible `expo-file-system ~57.0.7` through Expo CLI; updated the native manifest and pnpm lockfile.
- Shared controller hydration now validates saved data before initializing a fresh round. Snapshot writes are copied and serialized before subscriber notifications; later writes survive failures, and accepted writes finish after unmount. Ordinary moves and taunts are not written. Failed reads skip the initial autosave, preserving unread data until an explicit retry or subsequent accepted persistent change. Only a successful latest write clears the notice.
- Added stable app-root providers and concrete platform controller factories. Web uses live media-query appearance, checked Light/Dark/System menu choices and themed toasts. Native uses adaptive Unistyles for System, explicit overrides and reactive status-bar appearance. Overrides use the same saved snapshot as results/backgrounds; no second preference store or database was added.
- Added confirmed statistics reset on both platforms. It clears only totals, leaving current gameplay, theme and background intact. Rejected/empty resets do not write; resetting a completed board cannot count it twice. Added compact save-failure/retry notices, including inside native Settings because an iOS presented modal covers root siblings. Native preferences and the recovery notice account for the bottom safe area.
- Delegated codec/controller and both platform adapters to subagents, followed by independent read-only integration reviews. Applied the native modal-notice finding and the valid-counter boundary finding; no unresolved review defects remain.
- **Passed:** 104 tests — shared game 63, design 7, browser persistence/theme 14, native FileSystem/theme 20. Coverage includes schema validation, hydration order/stale loads, write order/reentrant changes, failures/retry/latest-write errors, post-unmount writes, fresh rounds on reload, reset preservation, safe-integer results, private-file backup/staging recovery and modern Expo API wiring. Native tests mock device file operations; they do not replace on-device filesystem acceptance.
- **Passed:** workspace TypeScript checks, web production/PWA build, workspace lint, scoped Step 4 formatting/lint and `git diff --check`. Existing starter warnings remain for unused native `TouchableOpacity`/`ref` and the web bundle size.
- **Passed:** production Vite integration preview using the real app providers, theme menu, reset handler, notice and localStorage. Verified loaded totals/Dark override, cancelled and accepted reset, preserved round/background, explicit Light ignoring system changes, live System changes through simulated media-query events, reload with fresh board/background advancement, malformed-data defaults, failed write with continued play and retry clearing the notice, and failed read preserving old JSON followed by successful recovery on reload. Browser logs contained no errors/warnings. Confirmation decisions and storage failures were injected by the disposable probe; the production controls were unchanged. Saved [recovery verification screenshot](./step4-recovery.jpg).
- **Passed:** offline Expo CLI `export:embed` probes for iOS and Android importing actual providers, preference controls, theme binding and FileSystem controller adapter. Source maps resolved these modules with one native React version (19.2.3). Temporary probes/server were removed afterward. These are bundle checks; actual simulator/device modal, appearance, alert and relaunch testing remains Step 7.
- **Verification limitation:** root `pnpm run check` still stops solely on formatting in the pre-existing `packages/infra/alchemy.run.ts` change. It was preserved; scoped formatting, workspace lint, types and builds passed separately.
- Next action: implement Step 5 web game screen, finished settings layout, accessibility and PWA delivery. The later computer cheating policy added to the plan was preserved; Step 4 changes do not implement that separate gameplay request.

### 2026-10-10 — Infrastructure formatting fixed and Step 5 completed

- Formatted the authorized infrastructure file while retaining its existing local-state/Cloudflare behavior. The former root-check formatting blocker is resolved; the pnpm migration and other pre-existing changes remain intact.
- Replaced the web starter page/header with the mobile-first game: Modi caricature and identity, assigned actor marks, thinking/outcome feedback, square illustrated board, latest taunt directly beneath it, totals and New game/Play again. Integrated the established shared controller, rules, taunts, artwork and persistence. Board rows stay equal even when marks appear.
- Added compact Settings using shared shadcn/Base UI dialog, field and toggle primitives, with a separate reset confirmation, safe-area-aware bounded dimensions, contained scrolling and return focus. Shared web Button controls now have 44px minimum targets, wrapping text and explicit transitions. Browser theme-color follows the resolved saved/system theme. Added the recovery notice inside Settings as well as the main page.
- Added actor/location-aware cell labels, winning-line/outcome descriptions, a skip link and polite announcements. Roving board focus survives occupied/thinking/terminal states; arrows/Home/End navigate and Enter/Space play legal moves. Reduced-motion CSS disables thinking/mark animations and background transitions. Enlarged text wraps the intro and controls; marks remain bounded within their cells.
- Completed the branded standalone manifest and HTML metadata. Generated regular 192/512 icons, a maskable 512 icon, Apple touch icon and favicon from a code-authored SVG using the existing PWA assets generator. Devtools are lazily rendered only in development and absent from production output. Font rendering uses system fonts; there are no font downloads or remote dependencies.
- Changed service-worker delivery to prompt mode with Reload/Not now and an offline-ready notice. Updates never reload an unconsenting tab, including when another tab activates the worker. Explicit Reload flushes saves before activation and drains later accepted writes again before the actual reload; save/update failures preserve play and expose a retryable message. Added the direct Workbox window dependency and pnpm lock update.
- Delegated game-screen and PWA implementation to subagents, plus independent React/accessibility/PWA review using the web-design-guidelines skill. Fixed the reported theme-color mismatch, late-save/update race, dialog safe-area/width issues and transition declarations. Browser QA also caught unequal grid rows and enlarged-text control overflow; both were fixed and reverified.
- **Passed:** `pnpm run check` — full repository formatting/lint and all workspace TypeScript checks, including game test types, design CSS provenance, seven-image integrity validation and the production web/PWA build. Native starter unused `TouchableOpacity`/`ref` warnings remain nonblocking. `git diff --check` passed.
- **Passed:** 117 tests — game 63, design 7, web 27 and native 20. New web tests cover loading/thinking/win/draw labels, actor-aware cell descriptions, keyboard bounds and update save/activation failures, including late queued writes and failure after worker activation.
- **Passed:** production artifact inspection — 22 precache entries, all six background WebPs plus opponent, application chunks/CSS and every emitted icon format. Confirmed standalone/root identity/scope/start, valid 192/512/maskable icons and Apple touch/viewport-fit metadata. No production devtools or remote font URLs are present; font extensions are covered for future bundled files.
- **Passed:** browser verification on the real production app at 320×720, 390×844, 844×390 landscape and 1280×900. No page horizontal overflow; desktop dialog width is capped at 416px and landscape dialog fits vertically with scrolling. A disposable production copy at 200% text/320px also has no page or dialog horizontal overflow. Verified 44px controls, equal grid cells, loaded artwork, keyboard arrows/Home/End/Enter/Space, stable focus through computer turns, skip-link focus, Settings Escape/return focus, thinking/terminal labels, winning-line lock, latest taunt changes, counted results, reset cancel/confirm and Light/Dark/System with matching theme-color. Reduced-motion rules were inspected in the compiled stylesheet; live assistive-technology and OS reduced-motion acceptance remain Step 7.
- **Passed:** real service-worker update verification across successive production builds. Not now retained the active round; Reload applied the update and restored saved preferences in a fresh round. Activating an update in a second tab did not reload or advance the first tab's board. The final save-drain policy also passed automated race/error regression tests.
- **Passed:** stopped the production preview server and reloaded from the service-worker cache. All seven images loaded, every background advanced/wrapped through New game, a complete offline round counted its result, and another offline reload retained that result while starting a fresh board. This is browser offline verification; installed production PWA testing on devices remains Step 7.
- Saved [mobile Light](./step5-mobile-light.jpg), [mobile Dark](./step5-mobile-dark.jpg), [desktop](./step5-desktop.jpg), [200% text settings](./step5-large-text.jpg) and [update prompt](./step5-update.jpg) evidence. Temporary large-text preview files/servers and test tabs were removed after verification.
- Next action: implement Step 6 Expo game screen and navigation. The later computer cheating policy in the plan is preserved; this step integrates the existing engine without altering its gameplay policy.

### 2026-10-10 — Steps 6–8 implementation and available verification completed

- The user explicitly chose to finish available checks and document native/device follow-up, and to retain the existing legal minimax opponent for this pass. The later 70% illegal-move policy remains deferred.
- Replaced native starter drawer/tab/demo routes with the main game and a compact Settings modal. Removed unused starter navigation helpers. One root controller persists across Settings; navigation has Settings/Done actions, theme-aware content/header/status bar and reduced-motion-aware transitions. Persistence notices are inside scroll content so they remain reachable.
- Added the native composition using the same controller, artwork, taunts, results and shared presentation copy as web. The 9-cell board guards invalid taps, describes actor/position/mark/winning lines and stays discoverable when locked. Latest taunts appear directly beneath the board. Product text scales, intro/score/settings rows wrap, safe-area content scrolls and controls use at least 44px targets. Decorative mark sizes remain bounded.
- Added focused iOS announcements that replace stale queued speech and Android polite live regions. Theme radios expose checked/selected state. Extracted shared turn/cell descriptions to `@tic-tac-chor/game/presentation`, retaining keyboard navigation in the web app. Both apps now use the same actor/outcome labels.
- Installed `expo-image ~57.0.5` via Expo CLI. Adapted the existing load-guarded six-image crossfade, preserved cancellation/reduced-motion behavior and shared contrast overlay. Browser QA found a zero-size portrait when passing Unistyles styles directly to expo-image; wrapping that third-party view with `withUnistyles` fixed it, verified at 96×96 with loaded artwork.
- Native Light/Dark overrides now also set React Native's app-level Appearance so alerts/system controls match; System clears that override before restoring adaptive Unistyles. The Expo browser preview guards RN Web's absent setter. Expanded existing theme tests verify override ordering and restoration. Root background and status-bar appearance follow the resolved theme.
- Added development-client, prebuild, platform export and `bundle:check` commands plus EAS internal-development/iOS-simulator profiles. Preserved existing application identifiers and did not create/link an EAS project. Replaced launcher/splash assets with rasterized variants of the existing brand SVG; automatic appearance, warm launch colors and unlocked rotation are configured.
- Delegated native game UI, build/config checks and shared presentation/test audit in parallel, then independently reviewed integration. Fixed radio state, stale speech, portrait interoperability and native dialog appearance; no unresolved functional findings remain in the reviewed source.
- **Passed:** all 117 tests — game 66, design 7, web 24, native 20. Presentation tests moved into the shared package; no redundant suite added. Automated Step 7 requirements cover every winning line, draws/invalid/terminal moves, both opener paths/all optimal tie choices, restarts/stale callbacks/rapid input/duplicate results, taunts, carousel, validated persistence and reset behavior. Native file operations remain mocked in unit tests.
- **Passed:** `pnpm run check` — full workspace formatting/lint and TypeScript, design CSS provenance, artwork integrity and web production/PWA build. Starter native unused-variable warnings are gone after demo cleanup. `git diff --check` passed. Production PWA remains 22 precache entries with all seven illustrations and icons; standalone root manifest and development-only devtools behavior are retained.
- **Passed:** final real Expo Router iOS and Android exports with Hermes bytecode: iOS 3,091,920 bytes; Android 3,276,292 bytes. `bundle:check` inspects current source-map contents against actual source files, game/settings/provider/storage/presentation/reduced-motion modules, absence of old drawer routes, one React 19.2.3 runtime and all seven WebPs byte-for-byte. Expo SDK dependency check, config introspection and both platform autolink graphs passed, including development client, Unistyles/Nitro, FileSystem and expo-image.
- **Passed with a limited preview:** the actual Expo app's browser export renders at 320px, 390px and 844px landscape without document horizontal overflow. Verified loaded portrait/backgrounds, game input/thinking/terminal winning-line labels, one counted result, Settings open/Done preserving the board and totals, Dark appearance and reachable recovery controls. Saved [Expo composition preview](./step6-expo-preview.jpg), [active board](./step6-expo-board.jpg) and [Settings](./step6-expo-settings.jpg). Expo FileSystem is unsupported in this browser preview, so it intentionally exercises continued play with the save notice; this is not native file persistence/device acceptance.
- **Remaining unchecked:** native binary development builds; actual iOS/Android functional, filesystem/relaunch, Light/Dark/System and accessibility acceptance; actual screen-reader/OS reduced-motion/larger-text device checks; installed standalone production PWA offline acceptance. This machine has only Command Line Tools, with no full Xcode/simctl/CocoaPods, Java or Android SDK/adb/emulator. Bundles are not recorded as proof of these live checks. Follow the concrete procedures in [verification.md](./verification.md) in a configured environment.
- Updated the root README with usage, local/cloud development commands, required Unistyles development clients, architecture/data lifecycle, taunt/artwork/token editing and retained infrastructure commands. Updated package presentation/provider guidance and the agreed plan. Reviewed final changes for scope; prior pnpm/infra and earlier-step work is preserved. No deployment, store submission or cloud build was performed.

- Final verification rerun after the appearance/interoperability fixes passed all workspace checks and 117 tests. Both platform bundle validators passed against current source. Temporary Expo browser preview output/server/tab were removed; native bundle artifacts remain in ignored `.cache` for inspection.

### 2026-10-17 — Distinct move sounds for both actors

- Added two procedurally synthesised, royalty-free WAV cues (no sampled or downloaded audio): a bright rising E5 → B5 chime for the human move and a lower falling B3 → F#3 knock for the computer reply. `packages/assets/scripts/sounds.mjs` renders them deterministically; `generate-sounds.mjs` writes them and `check-sounds.mjs` verifies the committed files are valid RIFF/WAVE, within the 48 KiB budget and byte-identical to a fresh render. Wired into `packages/assets` sound metadata plus explicit Vite/Metro registries.
- Extended the shared controller with an optional, best-effort `SoundPlayer` adapter and a persisted `soundEnabled` preference (legacy saves default to on; non-boolean values are rejected). A cue plays for every accepted move — including a cheating computer override — before publishing, and is skipped whenever sound is off. Apps inject platform players; the core stays platform-free.
- Web uses one preloaded `HTMLAudioElement` per actor and swallows autoplay/media errors so a cue can never delay a move. Native installs `expo-audio ~57.0.5` and reuses one `AudioPlayer` per actor, rewinding before replay and mixing without interrupting other audio. Added a Sound on/off control to both Settings panels.
- **Passed:** 141 tests — game 85, design 7, web 27, native 22. New coverage: distinct player/computer cues, cues suppressed while disabled and resumed when re-enabled, rejected input adds no cue, `setSoundEnabled` persistence with invalid/duplicate guards, legacy `soundEnabled` default, and both platform adapters (reuse, rewind, silent-switch/mix audio mode, unavailable/blocked playback).
- **Passed:** `pnpm run check` — formatting/lint, all workspace TypeScript, design CSS provenance, artwork and the new sound integrity checks, and the web production/PWA build. WAV cues are now precached (24 service-worker entries). Also ran `bundle:ios`/`bundle:android` plus `bundle:check`: both Hermes bundles include the two move sounds byte-for-byte and the new `lib/sound.ts` module with one React runtime.
- Remaining device acceptance is unchanged from the Steps 6–8 entry: live speaker output, silent-switch behaviour and the Settings toggle still need verification on real iOS/Android hardware.
