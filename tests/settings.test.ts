import { expect, it } from "vitest";
import {
  channelId,
  defaultSettings,
  normalizeSettings,
  normalizeThemeColor,
  themeColors,
} from "../src/domain/settings";

it("defaults legacy and invalid colors to green without changing notification preferences", () => {
  expect(defaultSettings().themeColor).toBe("green");
  expect(
    normalizeSettings({ soundEnabled: false, vibrationEnabled: false }),
  ).toEqual({
    themeColor: "green",
    soundEnabled: false,
    vibrationEnabled: false,
  });
  for (const invalid of [undefined, null, "pink", "GREEN", 12, {}, "__proto__"])
    expect(normalizeThemeColor(invalid)).toBe("green");
});

it("all six theme colors retain their selection and the same notification channel", () => {
  const settings = { ...defaultSettings(), soundEnabled: false };
  for (const themeColor of themeColors) {
    const value = normalizeSettings({ ...settings, themeColor });
    expect(value.themeColor).toBe(themeColor);
    expect(channelId(value)).toBe(channelId(settings));
    expect(value.soundEnabled).toBe(false);
  }
});
