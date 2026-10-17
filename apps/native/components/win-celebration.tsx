import {
  defaultWinCelebrations,
  getWinCelebrationKind,
  selectWinCelebration,
  type GameOutcome,
  type WinCelebrationConfig,
} from "@tic-tac-chor/game";
import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useReducedMotion } from "@/lib/use-reduced-motion";

export interface WinCelebrationProps {
  /** Terminal board outcome; renders nothing unless the computer won. */
  readonly outcome: GameOutcome;
  /**
   * Zero-based per-kind count of computer wins before this one. Pass the
   * fair-win count for fair wins and the cheat-win count for cheat wins so
   * each list rotates independently round-robin.
   */
  readonly occurrenceIndex: number;
  /** Full copy config; prefer this over the individual list props. */
  readonly config?: WinCelebrationConfig;
  /** Replace to change the fair-win copy; add entries to rotate them. */
  readonly fairTexts?: readonly string[];
  /** Replace to change the cheat-win copy; add entries to rotate them. */
  readonly cheatTexts?: readonly string[];
}

/** Fair wins bounce playfully; cheat wins get a large staggered text reveal. */
export function WinCelebration({
  outcome,
  occurrenceIndex,
  config,
  fairTexts = config?.fairComputerWin ?? defaultWinCelebrations.fairComputerWin,
  cheatTexts = config?.cheatComputerWin ?? defaultWinCelebrations.cheatComputerWin,
  revealDelayMs = 1100,
}: WinCelebrationProps & { revealDelayMs?: number }) {
  const [dismissed, setDismissed] = useState(false);
  // Hold the celebration back briefly so the winning mark is visible first.
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const kind = getWinCelebrationKind(outcome);
  const text =
    kind === null
      ? ""
      : selectWinCelebration(
          { fairComputerWin: fairTexts, cheatComputerWin: cheatTexts },
          kind,
          occurrenceIndex,
        );
  const words = useMemo(() => text.split(/\s+/).filter((word) => word.length > 0), [text]);

  // Belt-and-braces alongside the parent key={roundId}: re-arm if a new
  // outcome/text arrives on a reused instance.
  useEffect(() => {
    setDismissed(false);
    setRevealed(false);
    if (kind === null || text.length === 0) return;
    if (reducedMotion) {
      setRevealed(true);
      return;
    }
    const timer = setTimeout(() => setRevealed(true), revealDelayMs);
    return () => clearTimeout(timer);
  }, [outcome, text, kind, reducedMotion, revealDelayMs]);

  // Lazily created once per mount (mount == new win via key={roundId}).
  // Start at 1 so reduced-motion / first-frame renders show content.
  const drivers = useMemo(
    () => ({
      fairPop: new Animated.Value(1),
      fairWiggle: new Animated.Value(0),
      cheatBackdrop: new Animated.Value(1),
      cheatPulse: new Animated.Value(0),
    }),
    [],
  );
  const wordValues = useMemo(() => words.map(() => new Animated.Value(1)), [words]);
  const { fairPop, fairWiggle, cheatBackdrop, cheatPulse } = drivers;

  useEffect(() => {
    if (!revealed) return;
    if (kind === null || text.length === 0) return;
    if (reducedMotion) {
      fairPop.setValue(1);
      fairWiggle.setValue(0);
      cheatBackdrop.setValue(1);
      cheatPulse.setValue(0);
      wordValues.forEach((value) => value.setValue(1));
      return;
    }
    if (kind === "fair") {
      fairPop.setValue(0);
      fairWiggle.setValue(0);
      const entrance = Animated.spring(fairPop, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
        isInteraction: false,
      });
      const wiggle = Animated.loop(
        Animated.sequence([
          Animated.timing(fairWiggle, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(fairWiggle, {
            toValue: -1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]),
        { iterations: -1 },
      );
      entrance.start();
      wiggle.start();
      return () => {
        entrance.stop();
        wiggle.stop();
      };
    }
    cheatBackdrop.setValue(0);
    cheatPulse.setValue(0);
    wordValues.forEach((value) => value.setValue(0));
    const backdrop = Animated.timing(cheatBackdrop, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
      isInteraction: false,
    });
    const stagger = Animated.stagger(
      140,
      wordValues.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(cheatPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(cheatPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
      { iterations: -1 },
    );
    backdrop.start();
    stagger.start();
    pulse.start();
    return () => {
      backdrop.stop();
      stagger.stop();
      pulse.stop();
    };
  }, [
    kind,
    text,
    revealed,
    reducedMotion,
    fairPop,
    fairWiggle,
    cheatBackdrop,
    cheatPulse,
    wordValues,
  ]);

  if (kind === null || text.length === 0 || dismissed || !revealed) return null;

  if (kind === "fair") {
    return (
      <View style={styles.banner} accessible={false}>
        <Animated.View
          style={[
            styles.fairCard,
            {
              opacity: fairPop,
              transform: [
                { scale: fairPop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                {
                  rotate: fairWiggle.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ["-3deg", "3deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.fairText}>
            {text}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss celebration"
            onPress={() => setDismissed(true)}
            style={styles.dismiss}
          >
            <Text style={styles.dismissLabel}>✕</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.banner, styles.cheatBanner, { opacity: cheatBackdrop }]}>
      <Animated.View
        style={{
          transform: [
            {
              scale: cheatPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
            },
          ],
        }}
      >
        <Text style={styles.cheatKicker}>Masterstroke alert</Text>
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={text}
          style={styles.cheatTitleRow}
        >
          {wordValues.map((value, index) => (
            <Animated.Text
              key={`${words[index] ?? ""}-${index}`}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.cheatWord,
                index < words.length - 1 && styles.cheatWordSpaced,
                {
                  opacity: value,
                  transform: [
                    {
                      translateY: value.interpolate({
                        inputRange: [0, 1],
                        outputRange: [44, 0],
                      }),
                    },
                    { scale: value },
                  ],
                },
              ]}
            >
              {words[index] ?? ""}
            </Animated.Text>
          ))}
        </View>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss celebration"
        onPress={() => setDismissed(true)}
        style={[styles.dismiss, styles.dismissLight]}
      >
        <Text style={[styles.dismissLabel, styles.dismissLabelLight]}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    width: "100%",
    marginTop: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderCurve: "continuous",
  },
  fairCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    maxWidth: "100%",
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.playerMark,
    borderRadius: 999,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: 40,
  },
  fairText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: "800",
  },
  cheatBanner: {
    backgroundColor: "rgba(12, 8, 4, 0.92)",
    paddingVertical: theme.spacing.lg,
    overflow: "hidden",
  },
  cheatKicker: {
    color: "#f5d98b",
    fontSize: theme.fontSize.xs,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  cheatTitleRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  cheatWord: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
    flexShrink: 1,
    maxWidth: "100%",
  },
  cheatWordSpaced: {
    marginRight: 8,
  },
  dismiss: {
    position: "absolute",
    right: 6,
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissLight: {
    top: 8,
    marginTop: 0,
  },
  dismissLabel: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
  },
  dismissLabelLight: {
    color: "#ffffff",
  },
}));
