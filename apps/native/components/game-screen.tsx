import { nativeAssets } from "@tic-tac-chor/assets/native";
import {
  getActorMark,
  getWinCelebrationKind,
  type CellIndex,
  type ControllerSnapshot,
  type GameState,
} from "@tic-tac-chor/game";
import { getCellLabel, getTurnLabel } from "@tic-tac-chor/game/presentation";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles, withUnistyles } from "react-native-unistyles";

import { BoardBackdrop } from "./board-backdrop";
import { useGame } from "./game-provider";
import { PersistenceNotice } from "./persistence-notice";
import { WinCelebration } from "./win-celebration";

// expo-image is a third-party view; resolve Unistyles before passing its styles.
const ThemedImage = withUnistyles(Image);

const ROWS: readonly (readonly CellIndex[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];

function GameBoard({ snapshot }: { snapshot: Extract<ControllerSnapshot, { status: "ready" }> }) {
  const { controller } = useGame();
  const { rt } = useUnistyles();
  const { game, canPlayerMove } = snapshot;

  return (
    <View style={styles.board} accessible={false}>
      <BoardBackdrop
        backgroundIndex={game.backgroundIndex}
        colorScheme={rt.themeName === "dark" ? "dark" : "light"}
      />
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.boardRow, rowIndex < 2 && styles.rowDivider]}>
          {row.map((cell, columnIndex) => {
            const mark = game.board[cell];
            const winning = game.outcome.type === "win" && game.outcome.line.includes(cell);
            const disabled = !canPlayerMove || mark !== null;
            return (
              <Pressable
                key={cell}
                accessibilityRole="button"
                accessibilityLabel={getCellLabel(game, cell, canPlayerMove)}
                accessibilityState={{ disabled }}
                // Keep filled squares discoverable so screen readers can inspect the board.
                onPress={() => {
                  if (!disabled) controller.move(cell);
                }}
                style={({ pressed }) => [
                  styles.cell,
                  columnIndex < 2 && styles.columnDivider,
                  winning && styles.winningCell,
                  pressed && !disabled && styles.pressedCell,
                ]}
              >
                {mark !== null ? (
                  <Text
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    allowFontScaling={false}
                    style={[
                      styles.mark,
                      mark === game.playerMark ? styles.playerMark : styles.computerMark,
                    ]}
                  >
                    {mark === "X" ? "×" : "○"}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Android uses live regions; iOS replaces stale speech with the latest round message. */
function useRoundAnnouncement(snapshot: ControllerSnapshot) {
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );
  const roundId = snapshot.game?.roundId;
  const status = getTurnLabel(snapshot);
  const message = snapshot.game?.latestTaunt;
  useEffect(() => {
    if (process.env.EXPO_OS === "ios" && focused.current) {
      AccessibilityInfo.announceForAccessibilityWithOptions(
        `${status}${message ? ` ${message}` : ""}`,
        { queue: false },
      );
    }
  }, [roundId, status, message]);
}

/** In-memory per-kind rotation so fair/cheat lists advance independently. */
function useCelebrationOccurrence(game: GameState | null) {
  const counts = useRef({ fair: 0, cheat: 0 });
  const lastCountedRound = useRef<number | null>(null);
  const kind =
    game !== null && game.outcome.type === "win" && game.outcome.winner === "computer"
      ? getWinCelebrationKind(game.outcome)
      : null;
  const index = kind === null ? 0 : counts.current[kind];
  useEffect(() => {
    if (kind !== null && game !== null && lastCountedRound.current !== game.roundId) {
      lastCountedRound.current = game.roundId;
      counts.current[kind] += 1;
    }
  }, [game, kind]);
  return { kind, index };
}

export function GameScreen() {
  const { controller, snapshot } = useGame();
  const game = snapshot.game;
  const celebration = useCelebrationOccurrence(game);
  const { wins, losses, draws } = snapshot.persisted.stats;
  const completed = game !== null && game.outcome.type !== "in-progress";
  useRoundAnnouncement(snapshot);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <View style={styles.page}>
        <PersistenceNotice />
        <View style={styles.opponent}>
          <View style={styles.portraitFrame}>
            <ThemedImage
              source={nativeAssets.opponent.source}
              contentFit="cover"
              accessible={false}
              style={styles.portrait}
            />
          </View>
          <View style={styles.opponentMeta}>
            <Text accessibilityRole="header" style={styles.opponentName}>
              Nurundru Mudi
            </Text>
            <View style={styles.turn}>
              <View style={styles.turnDot} />
              <Text accessibilityLiveRegion="polite" selectable style={styles.turnLabel}>
                {getTurnLabel(snapshot)}
              </Text>
            </View>
          </View>
          {game !== null ? (
            <View style={styles.players}>
              <Text style={styles.playerDescription}>
                <Text style={styles.playerSymbol}>{getActorMark(game, "player")}</Text> You
              </Text>
              <Text style={styles.playerDescription}>
                <Text style={styles.computerSymbol}>{getActorMark(game, "computer")}</Text> Mudi
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.play}>
          <View style={styles.boardWrap}>
            {snapshot.status === "ready" ? (
              <GameBoard snapshot={snapshot} />
            ) : (
              <View style={[styles.board, styles.loadingBoard]} accessible={false}>
                <Text style={styles.loadingMarks} allowFontScaling={false}>
                  × ○
                </Text>
              </View>
            )}
          </View>
          {game !== null &&
          game.outcome.type === "win" &&
          game.outcome.winner === "computer" &&
          celebration.kind !== null ? (
            <WinCelebration
              key={`${game.roundId}-${celebration.kind}`}
              outcome={game.outcome}
              occurrenceIndex={celebration.index}
            />
          ) : null}
          <Text selectable accessibilityLiveRegion="polite" style={styles.taunt}>
            {game?.latestTaunt ?? "A new board. A new masterplan."}
          </Text>
        </View>

        <View style={styles.results}>
          <View style={styles.scoreboard}>
            {(
              [
                ["Wins", wins],
                ["Losses", losses],
                ["Draws", draws],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={styles.score}>
                <Text style={styles.scoreLabel}>{label}</Text>
                <Text
                  selectable
                  accessibilityLabel={`${label}: ${value.toLocaleString()}`}
                  style={styles.scoreValue}
                >
                  {value.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: snapshot.status !== "ready" }}
            disabled={snapshot.status !== "ready"}
            onPress={controller.newGame}
            style={({ pressed }) => [
              styles.newGame,
              (pressed || snapshot.status !== "ready") && styles.dimmed,
            ]}
          >
            <Text style={styles.newGameLabel}>{completed ? "Play again" : "New game"}</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Just a game. All dialogue is authored satire.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, runtime) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.md,
    paddingLeft: theme.spacing.md + runtime.insets.left,
    paddingRight: theme.spacing.md + runtime.insets.right,
    paddingBottom: theme.spacing.lg + runtime.insets.bottom,
    flexGrow: 1,
  },
  page: { width: "100%", maxWidth: 480, alignSelf: "center" },
  opponent: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.sm + 2,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  portraitFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.muted,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  portrait: { width: 44, height: 44 },
  opponentMeta: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 2 },
  opponentName: { color: theme.colors.foreground, fontSize: theme.fontSize.sm, fontWeight: "800" },
  turn: { flexDirection: "row", alignItems: "center", gap: 6 },
  turnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.playerMark },
  turnLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
  },
  players: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginLeft: "auto",
  },
  playerDescription: { color: theme.colors.mutedForeground, fontSize: theme.fontSize.xs },
  playerSymbol: { color: theme.colors.playerMark, fontWeight: "800" },
  computerSymbol: { color: theme.colors.computerMark, fontWeight: "800" },
  play: { gap: 14 },
  boardWrap: { position: "relative" },
  board: {
    width: "100%",
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: theme.colors.boardGrid,
    borderRadius: theme.borderRadius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  boardRow: { flex: 1, flexDirection: "row" },
  rowDivider: { borderBottomWidth: 2, borderBottomColor: theme.colors.boardGrid },
  cell: { flex: 1, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  columnDivider: { borderRightWidth: 2, borderRightColor: theme.colors.boardGrid },
  winningCell: { backgroundColor: theme.colors.boardOverlay },
  pressedCell: { backgroundColor: theme.colors.boardOverlay },
  mark: { fontSize: 76, lineHeight: 86, fontWeight: "700", textAlign: "center" },
  playerMark: { color: theme.colors.playerMark },
  computerMark: { color: theme.colors.computerMark },
  loadingBoard: { alignItems: "center", justifyContent: "center" },
  loadingMarks: { color: theme.colors.mutedForeground, fontSize: 76 },
  taunt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.computerMark,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  results: { marginTop: 18, gap: theme.spacing.md },
  scoreboard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: theme.spacing.md,
  },
  score: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  scoreLabel: { color: theme.colors.mutedForeground, fontSize: theme.fontSize.xs },
  scoreValue: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.lg,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  newGame: {
    backgroundColor: theme.colors.primary,
    minHeight: 48,
    borderRadius: theme.borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  newGameLabel: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "700",
    textAlign: "center",
  },
  dimmed: { opacity: 0.6 },
  footer: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
    textAlign: "center",
    marginTop: 20,
    paddingBottom: theme.spacing.sm,
  },
}));
