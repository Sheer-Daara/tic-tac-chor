import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useGame } from "./game-provider";

export function PersistenceNotice() {
  const { controller, snapshot } = useGame();
  if (snapshot.persistenceError === null) return null;

  return (
    <View style={styles.notice}>
      <Text selectable accessibilityLiveRegion="polite" style={styles.message}>
        Local data could not be loaded or saved. You can keep playing; changes may be lost.
      </Text>
      <Pressable accessibilityRole="button" onPress={controller.retrySave} style={styles.retry}>
        <Text style={styles.retryText}>Retry save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme, runtime) => ({
  notice: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingBottom: theme.spacing.sm + runtime.insets.bottom,
    gap: theme.spacing.xs,
  },
  message: { color: theme.colors.foreground, fontSize: theme.fontSize.sm },
  retry: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  retryText: { color: theme.colors.primary, fontWeight: "600" },
}));
