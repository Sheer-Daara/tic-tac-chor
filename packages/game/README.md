# Shared game engine and controller

`@tic-tac-chor/game` exports source TypeScript used by Vite and Metro. Its main entry
contains only platform-independent contracts, engine and controller code: importing it does
not load React or any browser/native APIs. The core type check uses `ESNext` without
DOM, Node or Cloudflare global types.

- `Board` is a readonly tuple of exactly nine cells; `CellIndex` is `0` through `8`.
- `GameState` records a numeric round ID, board, player's mark, actor turn (or `null`
  after completion), discriminated outcome, background position and latest message.
- `GameStats` counts player wins, losses and draws. `ThemePreference` is re-exported
  from the design package so both apps use one definition.
- `TauntConfig` provides category arrays and a fallback string. Categories are
  `opening`, `player-move`, `computer-move`, `computer-win` and `draw`.
- `PersistedSnapshot` version `1` contains statistics, theme and nullable last
  background position. A `PersistenceAdapter` asynchronously loads a valid snapshot
  or `null` and saves snapshots. Platform adapters use the shared snapshot codec;
  the controller also validates adapter output before creating a fresh round.
- `RandomSource` returns a number in `[0, 1)`. Both it and storage are required
  injected dependencies; no platform-specific defaults are hidden in this package.
- `Scheduler.schedule(callback, delayMs)` defers a one-shot callback and returns
  its cancellation function. Apps supply the adapter around their own timers.

## Engine

`createGameEngine()` provides immutable `createRound`/`applyMove` operations and
`chooseComputerMove`. Each round randomly selects the opener and assigns them X.
Wrong-turn, occupied, out-of-range and post-completion moves return the original
state. Winning outcomes identify the actor, mark and winning line; wins and draws
set `turn` to `null`.

Minimax scores outcomes as computer win, draw or computer loss. It selects randomly
among all equally optimal moves using the injected random source. It never loses
against any human play, regardless of who opens; there is no difficulty setting.
`getOptimalComputerMoves` exposes all best choices, `getActorMark` maps actors to
their current X/O marks, and `getAvailableCells`/`getBoardOutcome` inspect boards.

The computer may replace a player piece for an immediate win only when one or two
empty squares remain and perfect legal play would draw. This is its final scheduled
turn, so it gets one 70% cheat roll per eligible round. Declining the cheat leads to
a legal finish without another roll. Forced legal wins take priority, and completed
player wins are never changed. `getCheatComputerMoves` and `applyMove` enforce the
same timing and draw conditions; `chooseComputerMove` makes the probability roll.

## Taunts and background order

Edit the `sampleTaunts` arrays in `src/taunts.ts` to replace the sample Hinglish copy.
Both apps use this configuration by default; `createGameEngine({ taunts })` accepts
a custom `TauntConfig`. Every round starts with an opening message, and each accepted
move replaces `latestTaunt` with its actor's move message. Computer wins and draws
use their outcome category instead. A custom engine's human win uses the fallback,
because the planned unbeatable opponent has no player-win category.

`selectTaunt` trims copy, skips blank/duplicate entries and excludes the immediately
previous message, even across categories. An empty or exhausted category uses the
configured fallback. If that fallback is blank or would repeat, two built-in lines
ensure a nonempty, different message. Invalid moves keep the existing message and
consume no randomness. Round creation consumes randomness for the opener first,
then for the opening message; accepted moves consume randomness for their message.
The optional `previousTaunt` round argument prevents repeats across New Game.

## Win celebrations

Cheat overrides set `cheated: true` on the winning outcome, so the UI can tell a
fair computer win from a `MasterStroke`. `isCheatWin`/`isFairComputerWin` read that
flag, and `getWinCelebrationKind` maps it to a `"fair"`/`"cheat"` animation (`null`
for player wins and draws). Plain board inspection via `getBoardOutcome` never sets
the flag.

Edit `defaultWinCelebrations` in `src/celebrations.ts` (or pass `config` — or the
`fairTexts`/`cheatTexts` list props — on each app's `WinCelebration` component)
to change the copy. Add more entries to either array and `selectWinCelebration`
rotates through them round-robin by per-kind occurrence index, so fair and cheat
lists advance independently. Web and native track fair-win and cheat-win counts
separately in memory (resets on reload; stats persistence is unchanged), and an
empty list renders nothing rather than borrowing the other kind's copy.

`getNextBackgroundIndex` uses the ordered background count from the assets package.
No prior position starts at zero; each new round advances once and wraps around.
Invalid saved positions restart at zero. Moves never change the background.
Change/reorder artwork in `@tic-tac-chor/assets`, keeping its platform registries
in sync. Transition rendering belongs to the web/native screen components.

## Controller

`createGameController({ storage, random, scheduler, engine? })` creates an external
store, using the shared engine by default. An injected `GameEngine` can replace it
and must implement `createRound`, `applyMove` and `chooseComputerMove`.
The controller does not create
a round until `start()` activates it and asynchronous hydration finishes. A load
failure uses fresh defaults and exposes `persistenceError` to the consuming UI.
It skips the initial autosave so merely opening the app cannot overwrite unread saved
data. The error remains until an explicit retry or subsequent accepted persistent
change saves successfully; ordinary moves leave the unread save untouched.

`move(cell)` accepts human input only; the optional actor argument remains compatible
with Step 1 calls but rejects `computer`. The controller automatically schedules
computer openings and replies after `COMPUTER_THINKING_MS` (1,200 milliseconds).
`isThinking` and `canPlayerMove` are published atomically with the board for UI
feedback and input gating. Rapid/reentrant taps cannot place a second human mark
during the computer's turn. `newGame()` resets the board, picks a new opener and
supplies a new round ID plus the prior background position to the engine.

Completing a round updates loaded statistics once, from the player's
perspective. The board/result and totals publish together. Restarting an incomplete
round does not count a result, and a terminal board cannot count again. Saved theme
is retained and `lastBackgroundIndex` tracks the current round.
Counters saturate at `Number.MAX_SAFE_INTEGER` to preserve the validated snapshot
format even when a manually edited valid save reaches that limit.

`setThemePreference(theme)` changes the saved light/dark/system preference.
`resetStats()` zeros only totals, preserving the current round, theme and background;
the UI must obtain the user's confirmation before calling it. Unchanged preferences,
empty resets, and all actions while inactive or loading are ignored.

Initial hydration, new background positions, completed results, theme changes and
statistics resets enqueue serialized writes. Ordinary moves and taunts are never
saved. Write order is preserved through rapid/reentrant actions, and accepted writes
continue after the last consumer cleans up. Write failures leave gameplay usable and
publish `persistenceError`; the queue continues processing later writes. Only the
latest successful write clears an error, so an older completion cannot clear an
error while newer preferences are still pending. `retrySave()` explicitly saves the
latest in-memory snapshot. `whenSaved()` waits for writes accepted before its call;
it resolves on failure because the observable snapshot carries the error.

`decodeSnapshot(value)` validates version 1, safe nonnegative integer totals,
light/dark/system theme, and a nullable valid bundled background index.
`parseSnapshot(json)` returns `null` for missing/malformed/unsupported saved data.
`serializeSnapshot(snapshot)` rejects invalid writes. All three functions copy only
the version, totals, theme and position; board, latest taunt and history are excluded.
Corrupt adapter output resets to defaults, and a reload always creates a fresh board
after hydration, advancing the previously saved background once.

For React and React Native, import `useGameController` from
`@tic-tac-chor/game/react`. Create the controller once in the app-root provider (for example,
using a `useState` initializer), then pass it to the hook. Keep that provider above
navigation so opening Settings does not create another round. The hook subscribes with
`useSyncExternalStore` and activates the store in an effect. Cleanup invalidates
pending hydration and cancels computer timers when the last consumer leaves;
repeated cleanup is harmless and React StrictMode can activate it again safely.
Restart also cancels timers. Callback identity guards prevent late or repeated
callbacks from altering an old round, even if cancellation fails. Reactivating a
paused computer turn schedules a fresh full thinking delay without reloading data.
Direct users must call the cleanup
returned from `start()` and unsubscribe listeners when finished.

## Remaining steps and verification

Artwork and platform persistence APIs belong outside this package;
web/native game screens are implemented in Steps 5/6.

Run `pnpm --filter @tic-tac-chor/game check-types` for the production API and test types, and
`pnpm --filter @tic-tac-chor/game test` for rules, independent exhaustive minimax
oracle checks, controller timing/lifecycle/statistics, taunt selection, background-loop,
snapshot validation, write ordering and failure/reload tests.

## Shared presentation

Import `getTurnLabel` and `getCellLabel` from `@tic-tac-chor/game/presentation`.
Both web and native consume the same loading/thinking/outcome copy and actor-aware
row/column/mark labels. Occupied and terminal cells remain describable even when
input is blocked. Browser keyboard navigation stays in the web app.
