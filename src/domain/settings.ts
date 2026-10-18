export interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}
export const defaultSettings = (): AppSettings => ({
  soundEnabled: true,
  vibrationEnabled: true,
});
export function normalizeSettings(
  value?: Partial<AppSettings> | null,
): AppSettings {
  return {
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
