import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
if (process.platform !== "darwin")
  throw new Error("The native ImageIO check requires macOS and Xcode.");
const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "finish-widget-images-"),
);
const env = {
  ...process.env,
  DEVELOPER_DIR:
    process.env.DEVELOPER_DIR || "/Applications/Xcode.app/Contents/Developer",
};
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Native widget image check failed (${result.status})`);
}
try {
  const executable = path.join(temporary, "verify");
  run("xcrun", [
    "swiftc",
    "plugins/widgets/widget-images.swift",
    "tests/native/widget-image-check.swift",
    "-o",
    executable,
  ]);
  run(executable, [
    path.join(temporary, "cache"),
    ...["watch", "strict", "observe", "expect", "approve"].map(
      (face) => `assets/mascot/doberman-${face}.png`,
    ),
  ]);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
