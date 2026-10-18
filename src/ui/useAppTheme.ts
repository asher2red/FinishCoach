import { useMemo, useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { useStore } from "../data/context";
import { normalizeSettings } from "../domain/settings";
import { getPalette } from "./tokens";

export function useAppTheme() {
  const { state } = useStore();
  const scheme = useColorScheme();
  // Preserve the existing static-web hydration behavior.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = hydrated && scheme === "dark";
  const color = normalizeSettings(state.settings).themeColor;
  return useMemo(() => getPalette(color, dark), [color, dark]);
}
