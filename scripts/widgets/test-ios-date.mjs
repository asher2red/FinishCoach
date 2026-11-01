import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
if (process.platform !== "darwin") {
  console.log("iOS native date check requires macOS/Xcode.");
  process.exit(0);
}
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "finish-widget-date-"));
try {
  const executable = path.join(directory, "check");
  const env = {
    ...process.env,
    DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
  };
  execFileSync(
    "xcrun",
    [
      "swiftc",
      "plugins/widgets/routine-props.swift",
      "tests/native/widget-date-check.swift",
      "-o",
      executable,
    ],
    { env, stdio: "inherit" },
  );
  execFileSync(executable, [], { stdio: "inherit" });
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
