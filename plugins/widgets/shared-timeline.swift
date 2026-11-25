
// Finish Coach: file-backed timeline shared with the main application.
// Do not read the host app's private UserDefaults suite here.
private func finishCoachSharedTimeline() -> [[String: Any]]? {
  guard let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String,
        let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group),
        let data = try? Data(contentsOf: container.appendingPathComponent("ExpoWidgets/finish-coach-timeline-v1.json")),
        let document = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
        document["version"] as? Int == 1,
        let entries = document["entries"] as? [[String: Any]], !entries.isEmpty
  else { return nil }
  return entries
}

private func finishCoachInitialProps() -> [String: Any] {
  var props = WidgetsLayoutRegistry.initialProps(for: "FinishCoachWidget") ?? [:]
  if let url = Bundle.main.url(forResource: "FinishCoachWidgetStrings", withExtension: "json"),
     let data = try? Data(contentsOf: url),
     let catalog = (try? JSONSerialization.jsonObject(with: data)) as? [String: [String: String]] {
    let locale = Locale.preferredLanguages.first?.hasPrefix("ko") == true ? "ko" : "en"
    if let strings = catalog[locale] {
      props["titleBase"] = strings["widget.routines"]
      props["staleLine"] = strings["widget.refreshRoutines"]
    }
  }
  return props
}

private struct FinishCoachFileEntry: TimelineEntry {
  let date: Date
  let props: [String: Any]
}

private struct FinishCoachFileProvider: TimelineProvider {
  private func entries() -> [FinishCoachFileEntry] {
    (finishCoachSharedTimeline() ?? []).compactMap { value in
      guard let timestamp = value["timestamp"] as? Double,
            let props = value["props"] as? [String: Any] else { return nil }
      return FinishCoachFileEntry(date: Date(timeIntervalSince1970: timestamp / 1000), props: props)
    }.sorted { $0.date < $1.date }
  }
  func placeholder(in context: Context) -> FinishCoachFileEntry {
    FinishCoachFileEntry(date: Date(), props: finishCoachInitialProps())
  }
  func getSnapshot(in context: Context, completion: @escaping (FinishCoachFileEntry) -> Void) {
    let now = Date()
    let current = entries().last { $0.date <= now }
    completion(FinishCoachFileEntry(date: now, props: current?.props ?? finishCoachInitialProps()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<FinishCoachFileEntry>) -> Void) {
    let now = Date()
    let saved = entries()
    let current = FinishCoachFileEntry(date: now, props: saved.last(where: { $0.date <= now })?.props ?? finishCoachInitialProps())
    let midnight = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now)!)
    completion(Timeline(entries: [current] + saved.filter { $0.date > now }, policy: .after(midnight)))
  }
}

private struct FinishCoachFileView: View {
  @Environment(\.self) private var environment
  let entry: FinishCoachFileEntry
  var body: some View {
    if let layout = WidgetsLayoutRegistry.layout(for: "FinishCoachWidget") {
      let values = getWidgetEnvironment(environment: environment).merging(["timestamp": Int(entry.date.timeIntervalSince1970 * 1000)]) { _, new in new }
      let node = evaluateLayout(layout: layout, props: finishCoachRoutineProps(entry.props, now: entry.date), environment: values)
      let json = (try? JSONSerialization.data(withJSONObject: values)).flatMap { String(data: $0, encoding: .utf8) }
      WidgetsDynamicView(name: "FinishCoachWidget", kind: .widget, node: node, entryIndex: nil, environmentString: json)
    } else {
      EmptyWidgetView()
    }
  }
}
