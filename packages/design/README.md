# Shared design tokens

`@tic-tac-chor/design` exports platform-independent theme preference contracts, `designTokens` and `getThemeColors`. Warm cream/terracotta light colors and charcoal/peach dark colors share teal player marks, coral computer marks, spacing, typography, radii, a 44px minimum target and a 240ms background crossfade.

The native app maps these values into its existing Unistyles light/dark themes. Web imports `@tic-tac-chor/design/theme.css` after the UI package's globals. The generated file overrides shadcn semantic variables and adds game color utilities such as `text-player-mark`, `text-computer-mark`, `border-board-grid` and `bg-board-overlay`. Geometry/type/motion values are exposed as `--game-*` variables. Font sizes use rem on web and logical pixels on native.

Two type voices are shared by both platforms, and the app loads them from npm packages (`@fontsource-variable/fraunces`, `@fontsource-variable/baloo-2`) so they stay bundled and offline-ready:

- `typography.fontFamily` (`--game-font-family`) — **Fraunces Variable**, the classy editorial voice used for everything structural: the wordmark, names, scores, labels, buttons and body copy.
- `typography.funFontFamily` (`--game-font-fun-family`) — **Baloo 2 Variable** (Ek Type), the playful voice reserved for the opponent's spoken lines: taunts and win celebrations.

Keep the split meaningful: the fun face is a _voice_, not decoration, so it only appears where a character is talking. Web sits Fraunces over both faces in `apps/web/src/index.css`; native does not load custom faces yet and falls back to the system font.

Edit `src/tokens.ts`, then run:

- `pnpm --filter @tic-tac-chor/design generate:css`
- `pnpm --filter @tic-tac-chor/design check-types`
- `pnpm --filter @tic-tac-chor/design test`

The generator uses Node 24's built-in TypeScript support and has no runtime dependencies. `check-types` also checks that committed CSS exactly matches the token source. `check:css` runs that provenance check on its own.

Place the image(s) at the back of the board, a full-board `boardOverlay` layer above them, then grid lines, marks and any text on top. Keep the overlay fully present throughout the image crossfade. Never reduce foreground opacity or animate the overlay away. Tests prove at least 3:1 contrast for marks/grid and 4.5:1 for text against the worst black/white image pixels in both themes; monotonic RGB compositing extends that guarantee to every image color and crossfade blend. Marks must also retain their X/O shapes and actor labels.

Use `motion.backgroundCrossfade` for transitions and set their duration to zero when reduced motion is requested. Reusable `BoardBackdrop` components live in `apps/web/src/components/board-backdrop.tsx` and `apps/native/components/board-backdrop.tsx`; screens integrate those in Steps 5/6.

Persist `ThemePreference` (`system`, `light`, `dark`), and resolve system appearance inside each app. Browser appearance APIs and native Unistyles configuration remain outside this package. Live/persisted preference handling is Step 4.
