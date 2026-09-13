// Main App Entrypoint for MeowShadow Lab Mobile (iOS & Android)
// English comments only per project rules

import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { TabNavigator } from "./navigation/TabNavigator";
import { Colors } from "./theme/colors";

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme}>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
