import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("bundles small transparent Android faces while preserving full-size artwork", () => {
  let sourceBytes = 0;
  let widgetBytes = 0;
  for (const face of ["watch", "strict", "observe", "expect", "approve"]) {
    const source = readFileSync(`assets/mascot/doberman-${face}.png`);
    const widget = readFileSync(
      `modules/finish-coach-widget/android/src/main/res/drawable-nodpi/doberman_${face}.png`,
    );
    // PNG IHDR dimensions and RGBA color type, independent of the resizer.
    expect(widget.subarray(1, 4).toString()).toBe("PNG");
    expect(widget.readUInt32BE(16)).toBe(512);
    expect(widget.readUInt32BE(20)).toBe(512);
    expect(widget[25]).toBe(6);
    expect(source.readUInt32BE(16)).toBe(1254);
    expect(source.readUInt32BE(20)).toBe(1254);
    sourceBytes += source.length;
    widgetBytes += widget.length;
  }
  expect(widgetBytes).toBeLessThan(sourceBytes * 0.25);
});
