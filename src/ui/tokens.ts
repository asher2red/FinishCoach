import { Platform, ViewStyle } from "react-native";
import { ThemeColor } from "../domain/settings";

// All component surfaces share one selected accent. Artwork is never recolored.
const colors = {
  red: {
    light: ["#BD2837", "#FFF5F5", "#E9C7CC", "#FDE3E6"],
    dark: ["#FFA3AD", "#2B2026", "#65414A", "#442B35"],
  },
  blue: {
    light: ["#225FBE", "#F3F7FD", "#CBDCF0", "#DFEAF8"],
    dark: ["#9DC4FF", "#1C293B", "#3C536C", "#2A4058"],
  },
  green: {
    light: ["#236546", "#F3F8F4", "#CDDFD1", "#DFEDE1"],
    dark: ["#95D6AD", "#1D2D25", "#385843", "#2A4434"],
  },
  orange: {
    light: ["#9B4E0A", "#FFF7ED", "#ECD7BB", "#FCE8CB"],
    dark: ["#FFCA92", "#30271F", "#644D37", "#483728"],
  },
  purple: {
    light: ["#7141AF", "#F8F4FD", "#DDD0ED", "#EDE2F8"],
    dark: ["#CDB0FF", "#2B2437", "#54436B", "#3E314E"],
  },
  black: {
    light: ["#292D34", "#F5F6F7", "#D9DCE0", "#E7E9ED"],
    dark: ["#D3D6DC", "#24272E", "#484D57", "#333842"],
  },
};
export function getPalette(color: ThemeColor = "green", dark = false) {
  const [accent, surface, border, glow] =
    colors[color][dark ? "dark" : "light"];
  const tone = { surface, border, ink: accent, glow };
  return {
    bg: dark ? "#111725" : "#F7F8FA",
    card: dark ? "#1C2535" : "#FFFFFF",
    text: dark ? "#F0F3FA" : "#172039",
    muted: dark ? "#B2BED2" : "#62718B",
    accent,
    soft: surface,
    border,
    hover: glow,
    onAccent: dark ? "#111725" : "#FFFFFF",
    tones: {
      today: tone,
      routines: tone,
      history: tone,
      projects: tone,
      statistics: tone,
      settings: tone,
      bell: tone,
    },
  };
}
export const palettes = {
  light: getPalette(),
  dark: getPalette("green", true),
};
export type SurfaceTone = keyof typeof palettes.light.tones;
export const tokens = {
  radius: { button: 14, tile: 20, card: 20, icon: 24 },
  space: { small: 8, control: 14, card: 20 },
  icon: { action: 24, tile: 40 },
};
export const surfaceShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#24365A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  android: { elevation: 2, shadowColor: "#24365A" },
  web: { boxShadow: "0 4px 16px rgba(24, 39, 75, 0.06)" },
  default: {},
});
