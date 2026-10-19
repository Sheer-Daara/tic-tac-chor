import type { GameState } from "@tic-tac-chor/game";
import { useComputerMoveCard } from "@tic-tac-chor/game/react";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Long enough to read a short note, short enough to stay out of the way. */
const AUTO_HIDE_MS = 14_000;

/**
 * Floating note above the game screen, refreshed after every computer move.
 * The overlay itself is touch-transparent (`box-none`), so the board remains
 * playable around the card. A new round clears any note left over from the last.
 */
export function MoveCard({ game }: { readonly game: GameState | null }) {
  const { card, occurrence, dismiss } = useComputerMoveCard(game);
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (card === null) {
      entrance.setValue(0);
      return;
    }
    if (reducedMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [card, occurrence, reducedMotion, entrance]);

  useEffect(() => {
    if (card === null) return;
    const timer = setTimeout(dismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [card, occurrence, dismiss]);

  if (card === null) return null;

  const link = card.link;
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.card,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text maxFontSizeMultiplier={1.6} style={styles.eyebrow}>
          MOVE NOTE
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="header"
          maxFontSizeMultiplier={1.6}
          style={styles.title}
        >
          {card.title}
        </Text>
        {card.description === undefined ? null : (
          <Text maxFontSizeMultiplier={1.6} style={styles.description}>
            {card.description}
          </Text>
        )}
        {link === undefined ? null : (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Read more about ${card.title}`}
            onPress={() => {
              void WebBrowser.openBrowserAsync(link).catch(() => {});
            }}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          >
            <Text maxFontSizeMultiplier={1.6} style={styles.linkText}>
              Read more ↗
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss move note"
          hitSlop={8}
          onPress={dismiss}
          style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
        >
          <Text allowFontScaling={false} style={styles.dismissGlyph}>
            ×
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme, runtime) => ({
  overlay: {
    position: "absolute",
    right: runtime.insets.right + theme.spacing.sm,
    bottom: runtime.insets.bottom + theme.spacing.sm,
    left: runtime.insets.left + theme.spacing.sm,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    paddingVertical: 12,
    paddingLeft: theme.spacing.md,
    paddingRight: 46,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.computerMark,
    borderRadius: theme.borderRadius.md,
    borderCurve: "continuous",
    gap: 3,
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  eyebrow: {
    color: theme.colors.computerMark,
    fontSize: theme.fontSize.xs - 1,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: "800",
    lineHeight: 21,
  },
  description: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    lineHeight: 19,
  },
  link: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingRight: theme.spacing.sm,
  },
  linkPressed: { opacity: 0.65 },
  linkText: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: "700" },
  dismiss: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius.md,
  },
  dismissPressed: { backgroundColor: theme.colors.muted },
  dismissGlyph: {
    color: theme.colors.mutedForeground,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
  },
}));
