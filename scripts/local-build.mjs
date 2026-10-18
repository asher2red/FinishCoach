import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = homedir();
const env = {
  ...process.env,
  FASTLANE_SKIP_UPDATE_CHECK: "1",
  FASTLANE_HIDE_CHANGELOG: "1",
  FASTLANE_OPT_OUT_USAGE: "1",
};
const sdk =
  env.ANDROID_HOME || env.ANDROID_SDK_ROOT || join(home, "Library/Android/sdk");
const catalog = readFileSync(
  join(root, "node_modules/react-native/gradle/libs.versions.toml"),
  "utf8",
);
const required = (key) => {
  const match = catalog.match(new RegExp(`^${key} = "([^"]+)"`, "m"));
  if (!match)
    throw new Error(`React Native의 ${key} 버전을 확인하지 못했습니다.`);
  return match[1];
};
const compileSdk = required("compileSdk"),
  buildTools = required("buildTools"),
  ndk = required("ndkVersion");
const cmake = readFileSync(
  join(root, "node_modules/react-native/ReactAndroid/build.gradle.kts"),
  "utf8",
).match(/val cmakeVersion = .*?\?: "([^"]+)"/)?.[1];
const javaCandidates = [
  env.JAVA_HOME,
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
  "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
].filter(Boolean);
const javaHome = javaCandidates.find((p) => existsSync(join(p, "bin/java")));
if (javaHome) env.JAVA_HOME = javaHome;
env.ANDROID_HOME = sdk;
env.ANDROID_SDK_ROOT = sdk;
env.ANDROID_NDK_HOME = join(sdk, "ndk", ndk);
if (
  !env.DEVELOPER_DIR &&
  existsSync("/Applications/Xcode.app/Contents/Developer")
)
  env.DEVELOPER_DIR = "/Applications/Xcode.app/Contents/Developer";
env.PATH = [
  javaHome ? join(javaHome, "bin") : null,
  join(sdk, "platform-tools"),
  join(sdk, "cmdline-tools/latest/bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  env.PATH,
]
  .filter(Boolean)
  .join(":");
function probe(command, args) {
  const r = spawnSync(command, args, { encoding: "utf8", env, cwd: root });
  return { ok: r.status === 0, text: (r.stdout || r.stderr || "").trim() };
}
const versionAtLeast = (value, major, minor = 0) => {
  const [a, b] = value.split(".").map(Number);
  return a > major || (a === major && b >= minor);
};
function check(platform) {
  const checks = [
    {
      name: "Node.js 22.13+",
      ok: versionAtLeast(process.versions.node, 22, 13),
      detail: process.versions.node,
    },
  ];
  if (platform === "android") {
    const java = probe("java", ["-version"]);
    const major = java.text.match(/version "(\d+)/)?.[1];
    checks.push({
      name: "JDK 17+",
      ok: java.ok && Number(major) >= 17,
      detail: javaHome || "PATH의 java",
    });
    for (const [name, path] of [
      ["Android platform-tools", join(sdk, "platform-tools/adb")],
      [
        `Android SDK ${compileSdk}`,
        [
          join(sdk, `platforms/android-${compileSdk}/android.jar`),
          join(sdk, `platforms/android-${compileSdk}.0/android.jar`),
        ].find(existsSync) ??
          join(sdk, `platforms/android-${compileSdk}.0/android.jar`),
      ],
      [
        `Build Tools ${buildTools}`,
        join(sdk, "build-tools", buildTools, "apksigner"),
      ],
      [`NDK ${ndk}`, join(sdk, "ndk", ndk, "source.properties")],
      [`CMake ${cmake}`, cmake ? join(sdk, "cmake", cmake, "bin/cmake") : ""],
    ])
      checks.push({ name, ok: !!path && existsSync(path), detail: path });
  } else {
    const xcode = probe("xcodebuild", ["-version"]);
    const version = xcode.text.match(/Xcode ([\d.]+)/)?.[1] ?? "0";
    checks.push({
      name: "Xcode 26.4+",
      ok: xcode.ok && versionAtLeast(version, 26, 4),
      detail: xcode.ok ? version : "전체 Xcode 설치 및 최초 실행 필요",
    });
    for (const [name, command, args] of [
      [
        "iOS Simulator SDK",
        "xcrun",
        ["--sdk", "iphonesimulator", "--show-sdk-path"],
      ],
      ["CocoaPods", "pod", ["--version"]],
      ["fastlane", "fastlane", ["--version"]],
    ]) {
      const result = probe(command, args);
      checks.push({
        name,
        ok: result.ok,
        detail: result.ok ? "설치됨" : "설치 또는 Xcode 최초 실행 필요",
      });
    }
  }
  console.log(`\n${platform.toUpperCase()} 로컬 빌드 환경`);
  for (const c of checks)
    console.log(`${c.ok ? "✓" : "✗"} ${c.name} — ${c.detail}`);
  return checks.every((c) => c.ok);
}
const command = process.argv[2] ?? "doctor";
if (command === "doctor") {
  const platform = process.argv[3];
  if (platform && !["android", "ios"].includes(platform)) {
    console.error("플랫폼은 android 또는 ios입니다.");
    process.exit(1);
  }
  const android = platform === "ios" ? true : check("android");
  const ios = platform === "android" ? true : check("ios");
  process.exit(android && ios ? 0 : 1);
}
if (command === "run-android" || command === "run-ios") {
  const platform = command === "run-android" ? "android" : "ios";
  if (!check(platform)) process.exit(1);
  const args = [
    "expo",
    `run:${platform}`,
    ...(platform === "android" ? ["--device"] : []),
    ...process.argv.slice(3),
  ];
  const result = spawnSync("npx", args, { cwd: root, env, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
const commands = {
  android: {
    platform: "android",
    profile: "preview",
    output: "finish-coach-android-local.apk",
  },
  ios: {
    platform: "ios",
    profile: "simulator",
    output: "finish-coach-ios-simulator.tar.gz",
  },
  "ios-device": {
    platform: "ios",
    profile: "preview",
    output: "finish-coach-ios-device.ipa",
  },
};
const selected = commands[command];
if (!selected) {
  console.error(
    "사용법: node scripts/local-build.mjs doctor [android|ios] | android | ios | ios-device",
  );
  process.exit(1);
}
if (!check(selected.platform)) {
  console.error(
    "\n누락된 도구를 설치한 뒤 다시 실행하세요. 자세한 절차: docs/LOCAL-BUILD.md",
  );
  process.exit(1);
}
mkdirSync(join(root, "artifacts"), { recursive: true });
const output = join(root, "artifacts", selected.output);
console.log(
  `\n이 맥북에서 ${selected.platform} 빌드를 실행합니다. 결과: ${output}`,
);
console.log(
  "EAS는 프로젝트와 서명 자격 증명 확인에만 연결하며, 컴파일은 로컬에서 수행합니다.",
);
const result = spawnSync(
  "npx",
  [
    "eas-cli@latest",
    "build",
    "--local",
    "--platform",
    selected.platform,
    "--profile",
    selected.profile,
    "--output",
    output,
  ],
  { cwd: root, env, stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
