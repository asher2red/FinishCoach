import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
export function sourceInventory(keys) {
  const candidates = [],
    referenced = new Set(),
    unknown = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!/\.tsx?$/.test(file) || file === "src/i18n/generated.ts") continue;
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      function visit(node) {
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)
        ) {
          if (keys.has(node.text)) referenced.add(node.text);
          if (/[가-힣]/.test(node.text)) {
            const parent = node.parent;
            const display =
              ts.isJsxAttribute(parent) &&
              [
                "title",
                "label",
                "text",
                "accessibilityLabel",
                "accessibilityHint",
                "placeholder",
                "description",
              ].includes(parent.name.getText(source));
            candidates.push({
              value: node.text,
              source: file,
              line:
                source.getLineAndCharacterOfPosition(node.getStart(source))
                  .line + 1,
              kind: display
                ? "untranslated-ui"
                : "review-internal-value-or-preset",
              syntax: ts.SyntaxKind[parent.kind],
            });
          }
        }
        if (ts.isJsxText(node) && /[가-힣]/.test(node.text))
          candidates.push({
            value: node.text.replace(/\s+/g, " ").trim(),
            source: file,
            kind: "untranslated-ui",
          });
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
          const name = node.expression.getText(source);
          const index =
            name === "formatRaw" || name === "translate"
              ? 1
              : ["t", "tr", "message", "msg", "LocalizedError"].includes(name)
                ? 0
                : -1;
          const arg = index >= 0 ? node.arguments?.[index] : undefined;
          if (arg && ts.isStringLiteral(arg) && !keys.has(arg.text))
            unknown.push(`${file}: missing key ${arg.text}`);
          if (arg && ts.isTemplateExpression(arg)) {
            const prefix = arg.head.text;
            const suffix = arg.templateSpans.at(-1).literal.text;
            for (const key of keys)
              if (key.startsWith(prefix) && key.endsWith(suffix))
                referenced.add(key);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  walk("src");
  // Plural families are referenced by their base, and branches are generated resources.
  for (const key of keys)
    if (/\.plural\.(one|other)$/.test(key)) referenced.add(key);
  return {
    candidates,
    unknown,
    referenced: [...referenced].sort(),
    unusedKeys: [...keys].filter((key) => !referenced.has(key)).sort(),
  };
}
