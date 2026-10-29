const fs = require("node:fs");
const path = require("node:path");
const { withXcodeProject } = require("expo/config-plugins");

function patchTimeline(source, helper) {
  const provider = "WidgetsTimelineProvider(name: name)";
  const view = "WidgetsEntryView(entry: entry)";
  if (!source.includes(provider) || !source.includes(view))
    throw new Error(
      "Finish Coach: Expo widget provider changed; review the shared timeline integration.",
    );
  return (
    source
      .replace(provider, "FinishCoachFileProvider()")
      .replace(view, "FinishCoachFileView(entry: entry)") +
    "\n" +
    helper
  );
}
module.exports = (config) =>
  withXcodeProject(config, async (config) => {
    // Xcode project mods run after the official widget plugin's dangerous file mod.
    const root = config.modRequest.projectRoot;
    const targetDir = path.join(
      config.modRequest.platformProjectRoot,
      "ExpoWidgetsTarget",
    );
    const source = path.join(targetDir, "FinishCoachWidget.swift");
    fs.writeFileSync(
      source,
      patchTimeline(
        fs.readFileSync(source, "utf8"),
        fs.readFileSync(
          path.join(root, "plugins/widgets/shared-timeline.swift"),
          "utf8",
        ) +
          "\n" +
          fs.readFileSync(
            path.join(root, "plugins/widgets/widget-images.swift"),
            "utf8",
          ),
      ),
    );
    const catalog = JSON.parse(
      fs.readFileSync(
        path.join(root, "localization/widget-strings.json"),
        "utf8",
      ),
    );
    const resources = [
      ["assets/mascot/doberman-observe.png", "doberman-observe.png"],
      ["localization/widget-strings.json", "FinishCoachWidgetStrings.json"],
    ];
    if (!catalog.ko || !catalog.en)
      throw new Error(
        "Widget fallback translations missing. Run npm run widgets:generate.",
      );
    const project = config.modResults;
    const targets = project.pbxNativeTargetSection();
    const targetId = Object.keys(targets).find(
      (key) =>
        targets[key] &&
        typeof targets[key] === "object" &&
        targets[key].name?.replaceAll('"', "") === "ExpoWidgetsTarget",
    );
    if (!targetId)
      throw new Error("Finish Coach widget extension target is missing.");
    const phases = project.hash.project.objects.PBXResourcesBuildPhase || {};
    if (!targets[targetId].buildPhases.some((ref) => phases[ref.value])) {
      project.addBuildPhase(
        [],
        "PBXResourcesBuildPhase",
        "Resources",
        targetId,
      );
    }
    const widgetResources = project.pbxResourcesBuildPhaseObj(targetId);
    for (const [input, name] of resources) {
      fs.copyFileSync(path.join(root, input), path.join(targetDir, name));
      const resourcePath = `ExpoWidgetsTarget/${name}`;
      if (!project.hasFile(resourcePath))
        project.addResourceFile(
          resourcePath,
          { target: targetId },
          project.getFirstProject().firstProject.mainGroup,
        );
      else {
        // On --no-clean builds the file may already exist in another target.
        // File references can be shared; resource target membership cannot.
        const reference = Object.entries(
          project.pbxFileReferenceSection(),
        ).find(
          ([, file]) =>
            typeof file === "object" &&
            file.path?.replaceAll('"', "") === resourcePath,
        )?.[0];
        const buildFile = Object.entries(project.pbxBuildFileSection()).find(
          ([, file]) => typeof file === "object" && file.fileRef === reference,
        )?.[0];
        if (!buildFile)
          throw new Error(`Missing widget resource reference: ${name}`);
        if (!widgetResources.files.some((file) => file.value === buildFile))
          widgetResources.files.push({
            value: buildFile,
            comment: `${name} in Resources`,
          });
      }
    }
    return config;
  });
module.exports.patchTimeline = patchTimeline;
