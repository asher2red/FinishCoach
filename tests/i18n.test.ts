import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  parseCsv,
  encodeCsv,
  encodeTsv,
  unescapeTsv,
  validateCatalog,
} from "../scripts/i18n/csv.mjs";
import {
  translate,
  plural,
  detectLocale,
  resolveLocale,
  isLocale,
  message,
  formatMessage,
  LocalizedError,
  errorMessage,
} from "../src/i18n/core";
import { normalizeSettings } from "../src/domain/settings";
const table = [
  ["key", "ko", "en", "context", "source"],
  [
    "test.greeting",
    '안녕, {name}\n두 번째 줄\t"따옴표" \\n',
    'Hello, {name}\nSecond line\t"quotes" \\n',
    "literal tabs, quotes and backslashes",
    "src/ui/Example.tsx",
  ],
];
describe("CSV and spreadsheet round trip", () => {
  it("preserves commas, quotes, CRLF, newlines, tabs, backslashes and UTF-8 BOM", () => {
    expect(parseCsv("\uFEFF" + encodeCsv(table))).toEqual(table);
    expect(validateCatalog(parseCsv(encodeCsv(table))).entries[0].ko).toBe(
      table[1][1],
    );
    const pasted = encodeTsv(table)
      .trimEnd()
      .split("\n")
      .map((row) => row.split("\t"));
    expect(pasted).toHaveLength(2);
    expect(pasted.every((row) => row.length === 5)).toBe(true);
    // Simulates a Sheets CSV export after pasting escaped TSV, without contacting Google.
    const exported = parseCsv(encodeCsv(pasted)).map((row) =>
      row.map(unescapeTsv),
    );
    expect(exported).toEqual(table);
  });
  it.each(['a,"unclosed', 'a,b"bad', 'a,"closed"extra'])(
    "rejects malformed CSV: %s",
    (input) => expect(() => parseCsv(input)).toThrow(),
  );
  it("rejects duplicate keys/columns, missing columns, empty translations and variable mismatches", () => {
    expect(() => validateCatalog([...table, table[1]])).toThrow(
      "Duplicate key",
    );
    expect(() =>
      validateCatalog([["key", "ko", "en", "context", "source", "en"]]),
    ).toThrow("Duplicate CSV column");
    expect(() => validateCatalog([["key", "ko", "en"]])).toThrow(
      "Missing column",
    );
    const blank = structuredClone(table);
    blank[1][2] = " ";
    expect(() => validateCatalog(blank)).toThrow("empty en");
    const missing = structuredClone(table);
    missing[1][2] = "Hi {other}";
    expect(() => validateCatalog(missing)).toThrow("variables");
  });
  it("accepts an additional language column without a new parser or runtime format", () => {
    const expanded = table.map((row, i) => [
      ...row,
      i === 0 ? "ja" : "こんにちは {name}",
    ]);
    expect(validateCatalog(expanded).languages).toEqual(["ko", "en", "ja"]);
  });
});
describe("language selection and messages", () => {
  it("supports Korean and English counts without native Intl.PluralRules", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "PluralRules")!;
    Object.defineProperty(Intl, "PluralRules", {
      configurable: true,
      value: undefined,
    });
    try {
      expect(plural("en", "units.activityCount", 1)).toBe("1 activity");
      expect(plural("en", "units.activityCount", 0)).toBe("0 activities");
      expect(plural("ko", "units.activityCount", 1)).toBe("1회");
    } finally {
      Object.defineProperty(Intl, "PluralRules", descriptor);
    }
  });
  it("detects regional variants, skips unsupported preferences and falls back to English", () => {
    expect(detectLocale(["ko-KR"])).toBe("ko");
    expect(detectLocale(["en-GB"])).toBe("en");
    expect(detectLocale(["fr-FR", "ko-KR"])).toBe("ko");
    expect(detectLocale(["fr-FR"])).toBe("en");
    expect(detectLocale([])).toBe("en");
    expect(resolveLocale("en", ["ko-KR"])).toBe("en");
    expect(resolveLocale("ko", ["en-US"])).toBe("ko");
    expect(isLocale("__proto__")).toBe(false);
  });
  it("preserves themes and notification settings and keeps automatic language distinct", () => {
    const legacy = normalizeSettings({
      themeColor: "purple",
      backgroundTheme: "dark",
      soundEnabled: false,
    });
    expect(legacy.language).toBeNull();
    expect(normalizeSettings({ ...legacy, language: "en" })).toEqual({
      ...legacy,
      language: "en",
    });
  });
  it("interpolates named arguments and formats singular/plural counts", () => {
    expect(
      translate("en", "projects.milestones.nameRequired", { number: 3 }),
    ).toBe("Enter a name for milestone 3.");
    expect(plural("en", "units.activityCount", 1)).toBe("1 activity");
    expect(plural("en", "units.activityCount", 2)).toBe("2 activities");
    expect(plural("ko", "units.activityCount", 2)).toBe("2회");
  });
  it("keeps errors language-neutral until display and preserves user-provided interpolation", () => {
    const error = new LocalizedError("projects.milestones.nameRequired", {
      number: 2,
    });
    const value = errorMessage(error, "common.unknownError");
    expect(formatMessage(value, "ko")).toBe("마일스톤 2 이름을 입력하세요.");
    expect(formatMessage(value, "en")).toBe("Enter a name for milestone 2.");
    const state = message("purchases.buyAtPrice", { price: "₩1,100" });
    expect(formatMessage(state, "en")).toContain("₩1,100");
    expect(formatMessage(state, "ko")).toContain("₩1,100");
  });
});
it("generation and extraction are deterministic, preserve CSV edits and detect unknown keys/stale files", () => {
  const root = mkdtempSync(join(tmpdir(), "finish-i18n-"));
  try {
    mkdirSync(join(root, "localization"));
    mkdirSync(join(root, "src/i18n"), { recursive: true });
    mkdirSync(join(root, "src/ui"));
    cpSync("scripts/i18n", join(root, "scripts/i18n"), { recursive: true });
    symlinkSync(
      join(process.cwd(), "node_modules"),
      join(root, "node_modules"),
    );
    const csv = encodeCsv(table);
    writeFileSync(join(root, "localization/messages.csv"), csv);
    writeFileSync(
      join(root, "src/ui/Example.tsx"),
      'const result = tr("test.greeting", {name:"User"});',
    );
    const run = (mode: string) =>
      spawnSync(process.execPath, ["scripts/i18n/generate.mjs", mode], {
        cwd: root,
        encoding: "utf8",
      });
    expect(run("generate").status).toBe(0);
    const first = readFileSync(join(root, "src/i18n/generated.ts"), "utf8");
    expect(run("generate").status).toBe(0);
    expect(readFileSync(join(root, "src/i18n/generated.ts"), "utf8")).toBe(
      first,
    );
    expect(run("check").status).toBe(0);
    expect(run("extract").status).toBe(0);
    expect(readFileSync(join(root, "localization/messages.csv"), "utf8")).toBe(
      csv,
    );
    writeFileSync(
      join(root, "src/ui/Example.tsx"),
      'const result = tr("missing.key");',
    );
    expect(run("check").status).toBe(1);
    writeFileSync(
      join(root, "src/ui/Example.tsx"),
      'const result = tr("test.greeting", {name:"User"});',
    );
    writeFileSync(join(root, "src/i18n/generated.ts"), "stale");
    expect(run("check").status).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
