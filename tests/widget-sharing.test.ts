import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { emptyState } from "../src/domain/model";
import { makeWidgetSnapshot } from "../src/widgets/snapshot";
import { makeSharedTimeline } from "../src/widgets/timeline";
const require = createRequire(import.meta.url);
const { patchTimeline } = require("../plugins/with-finish-coach-widget.cjs");
it("sends an atomic-file protocol with current and neutral midnight entries", () => {
  const snapshot = makeWidgetSnapshot(
    emptyState(),
    "ko",
    new Date(2026, 9, 30, 12),
  );
  const images = {
    watch: "file:///watch.png",
    strict: "file:///strict.png",
    observe: "file:///observe.png",
    expect: "file:///expect.png",
    approve: "file:///approve.png",
  };
  const payload = JSON.parse(
    JSON.stringify(
      makeSharedTimeline(snapshot, images, {
        bg: "#fff",
        text: "#111",
        accent: "#246C4B",
        surface: "#eee",
      }),
    ),
  );
  expect(payload.version).toBe(1);
  expect(payload.entries).toHaveLength(2);
  expect(payload.entries[0].props).toMatchObject({
    line: "오늘 작전부터 세워볼까?",
    image: images.observe,
    neutralImage: images.observe,
    url: "finishcoach:///",
  });
  expect(payload.entries[1]).toMatchObject({
    timestamp: snapshot.expiresAt,
    props: { status: "stale", value: "—", neutralImage: images.observe },
  });
});
it("uses shared-file provider and includes bundled-image fallback in the extension", () => {
  const generated =
    "StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in WidgetsEntryView(entry: entry) }";
  const helper = readFileSync("plugins/widgets/shared-timeline.swift", "utf8");
  const result = patchTimeline(generated, helper);
  expect(result).toContain("provider: FinishCoachFileProvider()");
  expect(result).toContain("FinishCoachFileView(entry: entry)");
  expect(result).toContain(
    'container.appendingPathComponent("ExpoWidgets/finish-coach-timeline-v1.json")',
  );
  expect(result).toContain(
    'Bundle.main.url(forResource: "doberman-observe", withExtension: "png")',
  );
  expect(result).not.toContain("UserDefaults(suiteName:");
  expect(() => patchTimeline("unexpected SDK provider", helper)).toThrow(
    /provider changed/,
  );
});
