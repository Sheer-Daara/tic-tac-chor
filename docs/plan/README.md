# Tic-Tac-Chor: web PWA and Expo app

Status: Steps 1–5 are complete. Step 6 Expo implementation and development-build configuration are implemented; both platform bundles and available checks pass. Step 7 automated verification and Step 8 documentation/handoff are complete for this pass. Native binary/device, screen-reader and installed-PWA acceptance remain explicitly unchecked. The user requested completing available checks and documenting device follow-up.

Use [the implementation checklist](./checklist.md) to track progress. This document records the agreed product and implementation decisions.

## Summary

Build matching mobile-first apps featuring an unbeatable Narendra Modi caricature opponent, sly Hinglish banter, and an image behind the board that changes every new game.

Keep the existing stack: pnpm/Vite+, React 19, TanStack Router, Tailwind 4 and shadcn/Base UI on web; Expo SDK 57, Expo Router and Unistyles on native. At planning time, both starter apps passed type checks, and the web production/PWA build passed.

## Shared architecture

Add three workspace packages:

- **`packages/game`**: platform-independent rules, minimax opponent, round reducer, statistics, taunt configuration and selection. Export a shared React controller through a separate entry point, with injected storage and randomness.
- **`packages/design`**: shared light/dark colors, typography, spacing, radii and motion values. Generate web CSS variables from these tokens and consume the same values in native Unistyles.
- **`packages/assets`**: caricature, six optimized background illustrations and ordered image metadata. Provide explicit web asset imports and native static asset references so Vite and Metro bundle the same files.

Keep the existing UI package for web controls. Native uses React Native components styled to match the same composition and tokens.

Shared interfaces include `GameState`, `GameStats`, `ThemePreference`, `TauntConfig` and an asynchronous `load/save` persistence adapter. Platform APIs remain in the apps.

## Gameplay, personality and design

- Use standard 3×3 play. Randomly choose the opener each round and assign them X; clearly label the player's and opponent's current marks.
- Use minimax with random selection among equally optimal moves. The opponent remains unbeatable regardless of who starts.
- Show “thinking” feedback for approximately 1.2 seconds before the computer moves. Block invalid moves and cancel obsolete computer callbacks when restarting.
- Deferred by the user for the Steps 6–8 pass: allow the computer illegal moves, when the game is drawish. The computer can randomly delete or move user's move to a different square that helps the computer to win. This illegal move should also have a probability of 70%, So 30% time, the computer can let the game to happen legally. Encapsulate the logic in a clean way so that it can be tweaked later.
- Place a compact one-way message panel directly below the board. Replace its message after every valid move; terminal moves show the outcome taunt.
- Define editable taunt arrays for opening, player move, computer move, computer win and draw. Avoid immediate repetitions; provide a fallback when a category is empty.
- Include sample Hinglish lines such as “Wah, kya chaal chali hai!”, “Agli chaal ka intezaam ho chuka hai,” and “Draw? Is par committee baithegi.” The user will write the final taunts and can replace these directly in configuration.
- Create a recognizable editorial caricature with a smug expression, plus six illustrated civic backdrops. Bundle all artwork; use authored satirical dialogue. Use the imagegen skill for the raster artwork during implementation.
- Use a single main screen: title/opponent identity, turn status, square board, latest taunt, win/loss/draw totals and New Game. A compact settings panel provides theme selection and confirmed statistics reset.
- Advance backgrounds in a fixed loop on each new round, with a short crossfade. Keep the image stationary during play and maintain readable grid lines and marks over every background.
- Use warm light surfaces and deep charcoal dark surfaces with bold contrasting X/O colors. Default to System; persist explicit Light/Dark overrides.
- Support small phones, safe areas, larger text, keyboard navigation, screen readers and reduced motion. Controls have at least 44px touch targets.

## Persistence and platform delivery

- Persist only aggregate results, theme preference and last background position in a versioned, validated JSON snapshot.
- Web uses `localStorage`; IndexedDB is unnecessary for this small dataset. Native uses an app-private document file through [Expo FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), keeping application storage database-free.
- Load saved state before initializing a round. Count each completed game once, serialize saves, recover safely from malformed data and show a small notice if saving fails.
- Reloading or relaunching starts a fresh round. Abandoned rounds do not affect statistics; data remains separate on each device/browser.
- Replace starter screens and navigation with the game screen and settings. Keep router devtools development-only.
- Complete the PWA manifest, icons and standalone presentation. Precache the app, fonts and all background formats; offer user-controlled updates so an active game is not interrupted. Use the existing [PWA update mechanism](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).
- Retain Unistyles and use Expo development builds for iOS/Android. Correct the README because [Unistyles does not support Expo Go](https://www.unistyl.es/v3/other/frequently-asked-questions/).
- Preserve existing pnpm migration changes and Cloudflare infrastructure. Deployment and store submission are outside this implementation.

## Validation and defaults

- Add shared unit tests for every winning line, draws, invalid moves and exhaustive human move paths proving the computer cannot lose with either opener.
- Test restart during computer thinking, duplicate completion handling, taunt selection, carousel wraparound and storage failure recovery.
- Verify matching functionality on web, iOS and Android; test theme persistence, system theme changes, screen-reader announcements and reduced motion.
- Verify an installed production PWA reloads and completes multiple games offline with every background available.
- Run workspace lint/type checks, web production build and native bundle/build checks.

Default interface language is English, with editable Hinglish taunts. There are no difficulty settings, multiplayer, accounts, network-dependent gameplay, individual game history or cloud synchronization.

## Implemented persistence and preference bindings

The shared codec in `packages/game/src/persistence.ts` accepts version 1, nonnegative safe-integer totals, Light/Dark/System and a valid nullable background position. It discards extra fields; boards, taunts and game history are never saved. Missing, malformed or unsupported data uses defaults. Counters saturate at the safe-integer limit so even a valid manually edited snapshot remains writable.

Web stores one JSON value at `tic-tac-chor:snapshot:v1`. Native stores `tic-tac-chor/snapshot-v1.json` beneath Expo's private documents directory, stages writes in `.tmp` and retains one `.backup` recovery copy. Native loads a valid backup when the main file is missing or malformed. Storage access failures propagate to the shared controller instead of being mistaken for an empty installation.

Both app roots own one controller and hydrate it before creating a round. The controller queues writes in order for background changes, completed results, theme changes and statistics resets; accepted writes finish after consumer cleanup. Reload/relaunch keeps totals and preferences, creates a fresh board and advances the background once. Abandoned games never count.

On a read failure, a playable default round and a small notice appear, and initial autosave is skipped to preserve unread data. A reload can recover the previous save after access returns. **Retry save** explicitly saves current in-memory data; a later accepted persistent change also attempts a save. Failed writes leave gameplay available, and a successful latest write clears the notice. Statistics reset asks for confirmation and preserves the current round, theme and background.

The web theme provider follows a live appearance media query; native toggles Unistyles adaptive themes. System is the initial default. Light/Dark overrides persist through the same snapshot and ignore system changes until System is selected again. Native Settings uses the existing modal route, with the recovery notice inside the modal as well as the main layout. Web Settings now uses a compact dialog with appearance choices and a separate statistics-reset confirmation; the native Settings modal is part of the single game stack, with a Done action, scalable preferences and separate native reset confirmation.

## Implemented web game and PWA

The web main screen renders the shared controller, caricature and all six bundled backgrounds. It labels both actors' marks, announces turn/outcome changes, keeps the latest taunt directly below the board, displays aggregate totals and provides New game/Play again. Each round advances the image once; moves leave it stationary.

The board uses nine descriptively labelled buttons with roving focus. Arrow keys explore neighboring cells, Home/End go to the first/last cell, and Enter/Space play. `aria-disabled` retains focus while input is blocked during thinking, on occupied cells and after completion; both UI and controller reject those moves. A skip link reaches the main screen. Reduced-motion styles disable mark/thinking animations and background crossfades. Safe-area padding, wrapping controls and scrollable settings support small, landscape and enlarged-text layouts.

The manifest provides standalone presentation, root scope/start/identity, branded 192/512 icons, a maskable icon and Apple touch icon. Production bundles omit router devtools. Application chunks, CSS and all seven illustrations are precached; typography uses system fonts with no network dependency. Font extensions are included in the precache rules for future bundled font files.

Service-worker updates use prompt mode. Reload is an explicit choice and starts a fresh round; Not now leaves the current round intact. A worker activated by another tab still requires this tab's consent to reload. Before activation and again before the actual reload, persistence writes are flushed; the final flush drains any newer accepted writes and blocks reload if saving failed. Background update checks occur on window focus and restored connectivity, with no forced reload.

## Implemented Expo app and handoff

The starter drawer/tab/demo routes are replaced by `/` for the game and `/modal` for compact Settings. One app-root provider keeps the controller alive across Settings presentations. Native renders the same opponent, board backgrounds, assigned marks, turn/outcome copy, latest taunt, totals and New game/Play again behavior as web. Shared presentation labels live in `@tic-tac-chor/game/presentation`; UI controls remain platform-specific.

ScrollView content handles horizontal/bottom safe areas and wraps intro, scores and preference choices. Product text scales with accessibility font settings; decorative X/O glyphs alone remain bounded. Native cells remain discoverable when input is unavailable and describe actors, positions and winning lines. Android uses polite live regions; iOS replaces stale announcements with the newest focused-screen message. Reduce Motion disables background fades and stack transitions. System follows live device appearance; explicit preferences also override native app appearance so alerts match, while the status bar and root background follow the resolved Unistyles theme.

Artwork uses SDK-compatible `expo-image`, including a Unistyles wrapper for the portrait's third-party style mapping. The existing crossfade loads replacements before displaying them. Branded launcher, monochrome/adaptive icons and light/dark splash colors replace starter art; rotation is unlocked. Development-client scripts and EAS development/simulator profiles are configured without account linking or submission. Both final Hermes exports include every shared illustration and the current game/settings/storage/presentation modules.

See [verification and device acceptance](./verification.md) for reproducible commands and outstanding live checks. The current machine lacks full Xcode/simctl/CocoaPods and Java/Android SDK/adb/emulator, so native compilation and actual iOS/Android acceptance remain unverified. The browser PWA offline/update evidence from Step 5 remains valid; installed standalone device acceptance is distinct. The user explicitly chose the existing legal opponent for this pass, deferring the later illegal-move mechanic.
