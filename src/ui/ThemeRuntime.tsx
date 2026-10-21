import { useEffect } from "react";
import { Appearance } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useAppTheme } from "./useAppTheme";

export function ThemeRuntime() {
  const c = useAppTheme();
  useEffect(() => {
    Appearance.setColorScheme(c.dark ? "dark" : "light");
    void SystemUI.setBackgroundColorAsync(c.bg).catch((error: unknown) => {
      console.error("Theme system background update failed", error);
    });
  }, [c.dark, c.bg]);
  return <StatusBar style={c.dark ? "light" : "dark"} />;
}
