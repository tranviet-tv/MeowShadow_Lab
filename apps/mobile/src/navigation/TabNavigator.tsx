// Tab Navigator - Bottom tabs navigation configuration for MeowShadow Lab Mobile
// English comments only per project rules

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { RootTabParamList } from "../types/navigation";
import { LibraryScreen } from "../screens/LibraryScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { DownloadsScreen } from "../screens/DownloadsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { Colors } from "../theme/colors";

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabBarIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => (
  <View style={styles.iconContainer}>
    <Text style={[styles.iconText, { color: focused ? Colors.primary : Colors.textMuted }]}>
      {icon}
    </Text>
  </View>
);

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Library"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: "Thư Viện",
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📖" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          tabBarLabel: "Trình Phát",
          tabBarIcon: ({ focused }) => <TabBarIcon icon="🎧" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{
          tabBarLabel: "Ngoại Tuyến",
          tabBarIcon: ({ focused }) => <TabBarIcon icon="⬇" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Cài Đặt",
          tabBarIcon: ({ focused }) => <TabBarIcon icon="⚙" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
  iconText: {
    fontSize: 18,
  },
});
