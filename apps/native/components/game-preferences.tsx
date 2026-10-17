import type { ThemePreference } from "@tic-tac-chor/design";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useGame } from "./game-provider";
import { PersistenceNotice } from "./persistence-notice";

const preferences: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function GamePreferences() {
  const { controller, snapshot } = useGame();
  const ready = snapshot.status === "ready";
  const { wins, losses, draws } = snapshot.persisted.stats;
  const soundEnabled = snapshot.persisted.soundEnabled;
  const canReset = ready && wins + losses + draws > 0;

  function confirmReset() {
    Alert.alert(
      "Reset statistics?",
      "Your wins, losses and draws will be cleared. Your theme, background position and current round will stay the same.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: controller.resetStats },
      ],
      { cancelable: true },
    );
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {!ready && (
          <Text selectable style={styles.description}>
            Loading local preferences…
          </Text>
        )}
        <Text accessibilityRole="header" style={styles.heading}>
          Appearance
        </Text>
        <Text selectable style={styles.description}>
          System follows your device appearance.
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={styles.choices}>
          {preferences.map(({ value, label }) => {
            const selected = snapshot.persisted.theme === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={label}
                aria-checked={selected}
                accessibilityState={{ selected, checked: selected, disabled: !ready }}
                disabled={!ready}
                onPress={() => controller.setThemePreference(value)}
                style={[styles.choice, selected && styles.selectedChoice]}
              >
                <Text style={[styles.choiceLabel, selected && styles.selectedLabel]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          Sound
        </Text>
        <Text selectable style={styles.description}>
          Distinct cues play for your moves and Mudi's.
        </Text>
        <View style={styles.choices}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Move sound"
            accessibilityState={{ checked: soundEnabled, disabled: !ready }}
            disabled={!ready}
            onPress={() => controller.setSoundEnabled(!soundEnabled)}
            style={[styles.choice, soundEnabled && styles.selectedChoice]}
          >
            <Text style={[styles.choiceLabel, soundEnabled && styles.selectedLabel]}>
              {soundEnabled ? "Sound on" : "Sound off"}
            </Text>
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          Statistics
        </Text>
        <Text selectable style={styles.totals}>
          Wins {wins} · Losses {losses} · Draws {draws}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canReset }}
          disabled={!canReset}
          onPress={confirmReset}
          style={[styles.reset, !canReset && styles.disabled]}
        >
          <Text style={styles.resetLabel}>Reset statistics</Text>
        </Pressable>
        <Text selectable style={styles.description}>
          Results stay on this device. Relaunching starts a fresh round.
        </Text>
        <PersistenceNotice />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create((theme, runtime) => ({
  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: theme.spacing.lg,
    paddingLeft: theme.spacing.lg + runtime.insets.left,
    paddingRight: theme.spacing.lg + runtime.insets.right,
    paddingBottom: theme.spacing.lg + runtime.insets.bottom,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    flexGrow: 1,
  },
  heading: { color: theme.colors.foreground, fontSize: theme.fontSize.xl, fontWeight: "700" },
  description: { color: theme.colors.mutedForeground, fontSize: theme.fontSize.base },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  choice: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  selectedChoice: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  choiceLabel: { color: theme.colors.foreground, fontSize: theme.fontSize.base },
  selectedLabel: { color: theme.colors.primaryForeground },
  totals: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontVariant: ["tabular-nums"],
  },
  reset: {
    backgroundColor: theme.colors.destructive,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  resetLabel: {
    color: theme.colors.destructiveForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  disabled: { opacity: 0.5 },
}));
