import { Buffer } from "node:buffer";
import fs from "node:fs";
import { parseCsv, validateCatalog } from "../i18n/csv.mjs";
const check = process.argv.includes("--check");
const outdated = [];
function emit(file, data) {
  if (check) {
    if (
      !fs.existsSync(file) ||
      !fs.readFileSync(file).equals(Buffer.from(data))
    )
      outdated.push(file);
  } else fs.writeFileSync(file, data);
}
const catalog = validateCatalog(
  parseCsv(fs.readFileSync("localization/messages.csv", "utf8")),
);
const res = "modules/finish-coach-widget/android/src/main/res";
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', '\\"')
    .replaceAll("'", "\\'");
for (const locale of catalog.languages) {
  const folder = locale === "en" ? "values" : `values-${locale}`;
  if (!check) fs.mkdirSync(`${res}/${folder}`, { recursive: true });
  const entries = [
    ["finish_widget_stale", "widget.refreshRoutines"],
    ["finish_widget_title", "widget.routines"],
    ["finish_widget_description", "widget.description"],
  ];
  const xml = `<!-- Generated from localization/messages.csv. Do not edit. -->\n<resources>\n${entries.map(([name, key]) => `  <string name="${name}">${escape(catalog.entries.find((e) => e.key === key)[locale])}</string>`).join("\n")}\n</resources>\n`;
  emit(`${res}/${folder}/strings.xml`, xml);
}
const widgetCatalog = Object.fromEntries(
  catalog.languages.map((locale) => [
    locale,
    Object.fromEntries(
      catalog.entries
        .filter((entry) => entry.key.startsWith("widget."))
        .map((entry) => [entry.key, entry[locale]]),
    ),
  ]),
);
emit(
  "localization/widget-strings.json",
  JSON.stringify(widgetCatalog, null, 2) + "\n",
);

if (outdated.length) {
  console.error("Stale widget resources: " + outdated.join(", "));
  process.exitCode = 1;
} else
  console.log(
    check ? "Widget resources match the CSV." : "Widget strings generated.",
  );
