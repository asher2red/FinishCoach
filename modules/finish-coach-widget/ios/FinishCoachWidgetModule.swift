import ExpoModulesCore
import Foundation
import WidgetKit

public final class FinishCoachWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FinishCoachWidget")
    AsyncFunction("writeTimeline") { (json: String) in
      guard let data = json.data(using: .utf8),
            let document = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            document["version"] as? Int == 1,
            let entries = document["entries"] as? [[String: Any]], !entries.isEmpty,
            entries.allSatisfy({ ($0["props"] as? [String: Any])?["url"] as? String == "finishcoach:///" }),
            let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String,
            let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
      else { throw NSError(domain: "FinishCoachWidget", code: 1, userInfo: [NSLocalizedDescriptionKey: "Widget shared container or timeline is unavailable"]) }
      let directory = container.appendingPathComponent("ExpoWidgets", isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      // The extension reads the same file, independent of CFPreferences domains.
      try data.write(to: directory.appendingPathComponent("finish-coach-timeline-v1.json"), options: .atomic)
      WidgetCenter.shared.reloadTimelines(ofKind: "FinishCoachWidget")
    }
  }
}
