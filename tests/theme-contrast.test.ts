import { expect, it, vi } from "vitest";
import { getPalette } from "../src/ui/tokens";
import { themeColors } from "../src/domain/settings";
vi.mock("react-native", () => ({
  Platform: { select: (values: Record<string, unknown>) => values.web },
}));
function luminance(hex: string) {
  const components = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return (
    components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722
  );
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
it("all 12 theme combinations preserve readable text and selected actions", () => {
  for (const dark of [false, true])
    for (const color of themeColors) {
      const c = getPalette(color, dark);
      for (const surface of [c.bg, c.card, c.elevated, c.soft]) {
        expect(
          contrast(c.text, surface),
          `${color}/${dark} primary`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(c.muted, surface),
          `${color}/${dark} secondary`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(c.accent, c.soft)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
    }
});
