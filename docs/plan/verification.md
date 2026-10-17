# Verification and device acceptance

Use this guide with [the checklist](./checklist.md). Record the actual device/OS/browser and result before checking off live acceptance. A Metro bundle, mocked filesystem test or browser viewport test is not a native device run.

## Reproducible automated checks

From the workspace root:

```bash
pnpm run check
pnpm --filter @tic-tac-chor/game --filter @tic-tac-chor/design --filter web --filter native test
pnpm --filter web build
pnpm --filter native bundle:ios
pnpm --filter native bundle:android
pnpm --filter native bundle:check
```

`bundle:check` inspects both emitted Hermes bundles/source maps and checks actual routes/modules, one native React runtime, and all seven shared images byte-for-byte. It requires the preceding platform exports.

The shared suites cover every winning line, legal/invalid moves, both openers, all optimal minimax tie choices, rapid input, stale thinking callbacks, duplicate completion, taunt categories/fallback/repetition, carousel wraparound, snapshot validation, save ordering/failures/retry and reset preservation. Platform adapter tests cover browser localStorage and mocked private native files. Native presentation imports the same turn and cell labels as web.

## Native development builds

Install full Xcode plus a simulator for iOS; install Android Studio/SDK, Java and an emulator/device for Android. Expo Go is unsupported because this project retains Unistyles. From the root, `pnpm --filter native ios` or `pnpm --filter native android` creates and installs the local development client. On later launches, use `pnpm --filter native dev` and connect that client to Metro.

Use `apps/native/eas.json` development profiles for optional EAS builds after configuring your Expo account/project. Do not submit these to stores as part of acceptance. Rebuild the client after changing native dependencies, config plugins, icons or app configuration.

The implementation machine has Command Line Tools only, with no full Xcode/simctl, Android SDK/adb/emulator or Java. Compilation/install/live native acceptance therefore requires another configured environment. See the progress log for bundle/config checks completed here.

## Matching behavior on web, iOS and Android

Run each scenario on each platform and record evidence:

- Cold launch before local data loads shows a loading state; then a fresh round appears. Repeat New game until each actor opens; X belongs to the opener and both marks are labelled correctly.
- Play to a terminal result. Input is blocked during computer thinking, on occupied cells and after the outcome. Confirm totals increment once, taunt replacement and winning-line feedback. Restart during thinking and rapidly tap cells: the old computer callback must not affect the replacement round.
- Start seven rounds and confirm all six backgrounds advance in order, wrap, stay stationary during moves and retain readable lines/marks in both themes.
- Open Settings while thinking and after completion. Dismiss through Done, back and the platform's supported modal gesture; the controller/round must remain intact. Reset cancel preserves totals; accepted reset clears totals only, keeping round/background/theme.
- Finish a round, change theme, wait for saving and terminate/relaunch the app. Totals/theme survive; the board is fresh and background advances. Exercise a corrupt saved snapshot and a storage error/retry in a disposable test installation; verify recovery without a crash or stopping play.
- Choose Light and Dark; they override device appearance and persist on relaunch. Choose System, change device appearance live and verify content, navigation/status bar and Settings all follow it.

## Layout and assistive technology

Test a small phone, landscape phone, tablet/larger width, and the largest practical accessibility text size. The game and Settings scroll vertically; controls and content remain reachable with no horizontal clipping. Every actionable target is at least 44 logical pixels. Inspect long taunts and large totals.

On iOS VoiceOver and Android TalkBack, verify cell actor/mark/row/column labels, unavailable states, turn/outcome announcements, message replacement, theme selection and reset confirmation. Decorative artwork should not duplicate identity or board labels. Modal focus must enter Settings and return appropriately when dismissed.

Enable the device's Reduce Motion/Remove Animations preference before launch and toggle it live. Background changes must be immediate, with no crossfade; navigation should respect the preference. On web, verify reduced-motion rules with the OS preference, Tab/arrow/Home/End/Enter/Space board controls, visible focus, skip link, modal Escape and focus return. Use a real screen reader for final announcements rather than relying only on DOM attributes.

## Installed production PWA offline

Use an HTTPS production host or a local browser-supported secure origin. Build/serve the production app, wait for offline ready, and install it through the browser's app menu/Add to Home Screen. Record device/browser and standalone installation.

1. Open the installed app and visit all six backgrounds to establish that they render.
2. Disconnect the device from the network, close and reopen the installed app.
3. Reload, play multiple complete games, advance through all backgrounds and wrap the carousel. Confirm the opponent portrait, all backgrounds and controls render offline.
4. Close/reopen again; completed totals and theme must survive while a fresh round starts. Reconnect and test a new production update: Not now preserves the round, Reload applies the update after saves.
5. With two tabs/windows open, activate an update in one. The other must preserve its round until it independently accepts Reload.

Step 5 already verified the production service worker with the preview server stopped, including every image, a completed game and retained results after offline reload, plus live updates and cross-tab consent. The installed standalone/device run above remains distinct and unchecked until performed.
