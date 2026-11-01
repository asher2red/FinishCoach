import Foundation

@main struct WidgetDateCheck {
  static func main() {
    let parser = ISO8601DateFormatter()
    let now = parser.date(from: "2026-11-01T15:30:00Z")!
    let expiry = parser.date(from: "2026-11-02T15:00:00Z")!
    let seoul = TimeZone(identifier: "Asia/Seoul")!
    let source: [String: Any] = ["version": 2, "status": "current", "date": "2026-11-02", "timeZoneOffset": -540, "expiresAt": expiry.timeIntervalSince1970 * 1000]
    func valid(_ value: [String: Any], at date: Date = now, zone: TimeZone = seoul) -> Bool {
      finishCoachRoutineProps(value, now: date, timeZone: zone)["isCurrent"] as? Bool == true
    }
    precondition(valid(source), "Seoul after midnight must show today's list even on the previous UTC day")
    precondition(!valid(source, at: expiry), "Expired list must be hidden at midnight")
    precondition(!valid(source, zone: TimeZone(secondsFromGMT: 0)!), "Timezone change must invalidate old list")
    var legacy = source; legacy["version"] = 1
    precondition(!valid(legacy), "Legacy mascot payload must not be treated as a list")
    var stale = source; stale["status"] = "stale"
    precondition(!valid(stale))
    precondition(!valid([:]), "Missing payload must show refresh instructions")
    print("PASS: iOS native date, timezone, expiry and legacy snapshot checks")
  }
}
