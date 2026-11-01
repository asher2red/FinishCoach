import Foundation

// Hermes in an isolated widget runtime may use UTC. Validate in the OS timezone.
func finishCoachRoutineProps(_ source: [String: Any], now: Date = Date(), timeZone: TimeZone = .current) -> [String: Any] {
  var props = source
  let formatter = DateFormatter()
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = timeZone
  formatter.dateFormat = "yyyy-MM-dd"
  let expiresAt = (source["expiresAt"] as? NSNumber)?.doubleValue ?? 0
  props["isCurrent"] = source["version"] as? Int == 2 && source["status"] as? String == "current" &&
    source["date"] as? String == formatter.string(from: now) &&
    source["timeZoneOffset"] as? Int == -timeZone.secondsFromGMT(for: now) / 60 &&
    expiresAt > now.timeIntervalSince1970 * 1000
  return props
}
