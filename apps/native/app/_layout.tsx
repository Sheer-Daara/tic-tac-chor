import "@/unistyles";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import * as SystemUI from "expo-system-ui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";

import { GameProvider } from "@/components/game-provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  return (
    <GameProvider>
      <AppLayout />
    </GameProvider>
  );
}

function AppLayout() {
  const { theme, rt } = useUnistyles();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme.colors.background]);

  function headerAction(label: string, onPress: () => void) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={{
          minHeight: theme.minimumTouchTarget,
          minWidth: theme.minimumTouchTarget,
          justifyContent: "center",
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        <Text
          style={{ color: theme.colors.primary, fontSize: theme.fontSize.base, fontWeight: "600" }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={rt.themeName === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTitleStyle: {
            color: theme.colors.foreground,
          },
          headerTintColor: theme.colors.foreground,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: reducedMotion ? "none" : "default",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Tic-Tac-Chor",
            headerRight: () => headerAction("Settings", () => router.navigate("/modal")),
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            title: "Settings",
            presentation: "modal",
            headerRight: () => headerAction("Done", () => router.back()),
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
