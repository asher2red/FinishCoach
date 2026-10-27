import fs from "node:fs";
import { parseCsv, encodeCsv, unescapeTsv, validateCatalog } from "./csv.mjs";
const file = process.argv[2];
try {
  if (!file || file.startsWith("--"))
    throw new Error(
      "Usage: npm run i18n:import-sheet -- path/to/export.csv [--escaped] [--write]",
    );
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (process.argv.includes("--escaped"))
    for (const row of rows)
      for (let i = 0; i < row.length; i++) row[i] = unescapeTsv(row[i]);
  const incoming = validateCatalog(rows);
  const previous = validateCatalog(
    parseCsv(fs.readFileSync("localization/messages.csv", "utf8")),
  );
  const entries = new Map(previous.entries.map((entry) => [entry.key, entry]));
  for (const entry of incoming.entries)
    entries.set(entry.key, { ...entries.get(entry.key), ...entry });
  const table = [
    incoming.header,
    ...[...entries.values()]
      .sort((a, b) => a.key.localeCompare(b.key, "en"))
      .map((entry) => incoming.header.map((name) => entry[name] ?? "")),
  ];
  validateCatalog(table);
  const omitted = previous.entries.filter(
    (entry) => !incoming.entries.some((next) => next.key === entry.key),
  ).length;
  console.log(
    `${incoming.entries.length} incoming keys; ${omitted} omitted existing keys preserved.`,
  );
  if (process.argv.includes("--write")) {
    const temporary = "localization/messages.csv.tmp";
    fs.writeFileSync(temporary, encodeCsv(table));
    fs.renameSync(temporary, "localization/messages.csv");
    console.log(
      "CSV updated. Run npm run i18n:generate and npm run i18n:check.",
    );
  } else console.log("Dry run only. Add --write to update the source CSV.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
