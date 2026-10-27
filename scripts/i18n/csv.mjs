// Strict RFC 4180 reader with UTF-8 BOM support. No runtime dependency.
export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false,
    closed = false;
  const field = () => {
    row.push(cell);
    cell = "";
    closed = false;
  };
  const record = () => {
    field();
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === '"') {
      if (cell || closed) throw new Error(`Unexpected quote at character ${i}`);
      quoted = true;
    } else if (char === ",") field();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record();
    } else {
      if (closed)
        throw new Error(
          `Unexpected text after closing quote at character ${i}`,
        );
      cell += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length || closed) record();
  return rows;
}
export function encodeCsv(rows) {
  return (
    rows
      .map((row) =>
        row
          .map((value) =>
            /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value,
          )
          .join(","),
      )
      .join("\r\n") + "\r\n"
  );
}
export function escapeTsv(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\t", "\\t")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n");
}
export function unescapeTsv(value) {
  return value.replace(
    /\\([\\trn])/g,
    (_, char) => ({ "\\": "\\", t: "\t", r: "\r", n: "\n" })[char],
  );
}
export function encodeTsv(rows) {
  return rows.map((row) => row.map(escapeTsv).join("\t")).join("\n") + "\n";
}
export function variables(value) {
  return [
    ...new Set(
      [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((m) => m[1]),
    ),
  ].sort();
}
export function validateCatalog(rows) {
  if (!rows.length) throw new Error("CSV is empty");
  const header = rows[0];
  for (const required of ["key", "ko", "en", "context", "source"])
    if (!header.includes(required))
      throw new Error(`Missing column: ${required}`);
  if (new Set(header).size !== header.length)
    throw new Error("Duplicate CSV column");
  const languages = header.filter(
    (name) =>
      /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(name) &&
      !["key", "context", "source"].includes(name),
  );
  for (const name of header)
    if (!["key", "context", "source", ...languages].includes(name))
      throw new Error(`Invalid language or metadata column: ${name}`);
  const entries = rows.slice(1).map((row, i) => {
    if (row.length !== header.length)
      throw new Error(
        `Row ${i + 2}: expected ${header.length} cells, got ${row.length}`,
      );
    const entry = Object.fromEntries(
      header.map((name, index) => [name, row[index]]),
    );
    if (!/^[a-zA-Z][\w.-]*$/.test(entry.key))
      throw new Error(`Invalid key: ${entry.key}`);
    for (const language of languages) {
      if (!entry[language].trim())
        throw new Error(`${entry.key}: empty ${language} translation`);
      if (variables(entry.ko).join() !== variables(entry[language]).join())
        throw new Error(
          `${entry.key}: ${language} interpolation variables do not match ko`,
        );
    }
    return entry;
  });
  const keys = new Set();
  for (const entry of entries) {
    if (keys.has(entry.key)) throw new Error(`Duplicate key: ${entry.key}`);
    keys.add(entry.key);
  }
  for (const entry of entries.filter(
    (e) => e.key.endsWith(".plural.one") || e.key.endsWith(".plural.other"),
  )) {
    const base = entry.key.replace(/\.(one|other)$/, "");
    if (!keys.has(`${base}.one`) || !keys.has(`${base}.other`))
      throw new Error(`${base}: plural messages need both .one and .other`);
  }
  return {
    header,
    languages,
    entries: entries.sort((a, b) => a.key.localeCompare(b.key, "en")),
  };
}
