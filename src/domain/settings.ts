export const themeColors = [
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "black",
] as const;
export type ThemeColor = (typeof themeColors)[number];
export function normalizeThemeColor(value: unknown): ThemeColor {
  return themeColors.includes(value as ThemeColor)
    ? (value as ThemeColor)
    : "green";
}
export interface AppSettings {
  themeColor: ThemeColor;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}
export const defaultSettings = (): AppSettings => ({
  themeColor: "green",
  soundEnabled: true,
  vibrationEnabled: true,
});
export function normalizeSettings(
  value?: Partial<AppSettings> | null,
): AppSettings {
  return {
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
