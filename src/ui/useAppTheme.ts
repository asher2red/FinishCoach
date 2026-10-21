import { useMemo } from "react";
import { useStore } from "../data/context";
import { normalizeSettings } from "../domain/settings";
import { getPalette } from "./tokens";

export function useAppTheme() {
  const { state } = useStore();
  const { backgroundTheme, themeColor: color } = normalizeSettings(
    state.settings,
  );
  const dark = backgroundTheme === "dark";
  return useMemo(() => getPalette(color, dark), [color, dark]);
}
