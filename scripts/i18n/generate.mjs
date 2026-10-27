import { sourceInventory } from "./source.mjs";
import fs from "node:fs";
import { parseCsv, validateCatalog, encodeTsv, variables } from "./csv.mjs";
const mode = process.argv[2] ?? "generate";
try {
  const catalog = validateCatalog(
    parseCsv(fs.readFileSync("localization/messages.csv", "utf8")),
  );
  const inventory = sourceInventory(
    new Set(catalog.entries.map((entry) => entry.key)),
  );
  if (mode === "extract") {
    fs.writeFileSync(
      "localization/extraction-report.json",
      JSON.stringify(inventory, null, 2) + "\n",
    );
    console.log(
      `${inventory.candidates.length} review candidates; ${inventory.unusedKeys.length} unused keys (not deleted). CSV unchanged.`,
    );
    process.exit(0);
  }
  if (inventory.unknown.length) throw new Error(inventory.unknown.join("\n"));
  if (
    mode === "check" &&
    inventory.candidates.some((item) => item.kind === "untranslated-ui")
  )
    throw new Error(
      "Untranslated JSX text/attribute found. Run npm run i18n:extract and review the report.",
    );
  const resources = Object.fromEntries(
    catalog.languages.map((lang) => [
      lang,
      Object.fromEntries(
        catalog.entries.map((entry) => [entry.key, entry[lang]]),
      ),
    ]),
  );
  const params = Object.fromEntries(
    catalog.entries.map((entry) => [
      entry.key,
      Object.fromEntries(
        variables(entry.ko).map((name) => [name, "string | number"]),
      ),
    ]),
  );
  const typeRows = Object.entries(params)
    .map(([key, values]) => {
      const names = Object.keys(values);
      const shape = names.length
        ? `{${names.map((name) => `${JSON.stringify(name)}: string | number`).join("; ")}}`
        : "Record<never, never>";
      return `  ${JSON.stringify(key)}: ${shape};`;
    })
    .join("\n");
  const output = `// Generated from localization/messages.csv. DO NOT EDIT.\nexport const resources = ${JSON.stringify(resources, null, 2)} as const;\nexport type Locale = keyof typeof resources;\nexport type MessageKey = keyof typeof resources.ko;\nexport interface MessageParams {\n${typeRows}\n}\n`;
  const table = [
    catalog.header,
    ...catalog.entries.map((entry) =>
      catalog.header.map((name) => entry[name]),
    ),
  ];
  const files = [
    ["src/i18n/generated.ts", output],
    ["localization/messages.tsv", encodeTsv(table)],
  ];
  for (const [file, content] of files) {
    if (mode === "check") {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content)
        throw new Error(`${file} is out of date. Run npm run i18n:generate.`);
    } else fs.writeFileSync(file, content);
  }
  console.log(
    `${catalog.entries.length} keys; languages: ${catalog.languages.join(", ")}; ${mode} OK`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
