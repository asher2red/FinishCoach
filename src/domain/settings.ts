export const themeColors = [
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "black",
] as const;
export type ThemeColor = (typeof themeColors)[number];
export const backgroundThemes = ["light", "dark"] as const;
export type BackgroundTheme = (typeof backgroundThemes)[number];
export function normalizeBackgroundTheme(value: unknown): BackgroundTheme {
  return value === "dark" ? "dark" : "light";
}
export function normalizeThemeColor(value: unknown): ThemeColor {
  return themeColors.includes(value as ThemeColor)
    ? (value as ThemeColor)
    : "green";
}
export interface AppSettings {
  backgroundTheme: BackgroundTheme;
  themeColor: ThemeColor;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}
export const defaultSettings = (): AppSettings => ({
  backgroundTheme: "light",
  themeColor: "green",
  soundEnabled: true,
  vibrationEnabled: true,
});
export function normalizeSettings(
  value?: Partial<AppSettings> | null,
): AppSettings {
  return {
    backgroundTheme: normalizeBackgroundTheme(value?.backgroundTheme),
    themeColor: normalizeThemeColor(value?.themeColor),
    soundEnabled:
      typeof value?.soundEnabled === "boolean" ? value.soundEnabled : true,
    vibrationEnabled:
      typeof value?.vibrationEnabled === "boolean"
        ? value.vibrationEnabled
        : true,
  };
}
export function channelId(settings: AppSettings) {
  return `routines-v2-s${Number(settings.soundEnabled)}-v${Number(settings.vibrationEnabled)}`;
}
