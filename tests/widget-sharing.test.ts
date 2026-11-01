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
  const payload = JSON.parse(JSON.stringify(makeSharedTimeline(snapshot)));
  expect(payload.version).toBe(1);
  expect(payload.entries).toHaveLength(2);
  expect(payload.entries[0].props).toMatchObject({
    title: "오늘 루틴(0/0)",
    items: [],
    url: "finishcoach:///",
  });
  expect(payload.entries[1]).toMatchObject({
    timestamp: snapshot.expiresAt,
    props: { status: "stale", items: [], title: "오늘 루틴(—/—)" },
  });
});
it("uses shared-file provider without mascot image resources", () => {
  const generated =
    "StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in WidgetsEntryView(entry: entry) }";
  const helper = readFileSync("plugins/widgets/shared-timeline.swift", "utf8");
  const result = patchTimeline(generated, helper);
  expect(result).toContain("provider: FinishCoachFileProvider()");
  expect(result).toContain("FinishCoachFileView(entry: entry)");
  expect(result).toContain(
    'container.appendingPathComponent("ExpoWidgets/finish-coach-timeline-v1.json")',
  );
  expect(result).not.toContain("doberman");
  expect(result).not.toContain("finishCoachRenderProps");
  expect(result).not.toContain("UserDefaults(suiteName:");
  expect(() => patchTimeline("unexpected SDK provider", helper)).toThrow(
    /provider changed/,
  );
});
