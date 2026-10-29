import Foundation
import ImageIO

// WidgetKit archives actual bitmap dimensions, not the SwiftUI frame size.
// Decode a bounded thumbnail instead of archiving a 1254px source image.
func finishCoachWidgetImage(_ uri: String, cacheDirectory: URL? = nil) throws -> URL {
  guard let sourceURL = URL(string: uri), sourceURL.isFileURL,
        let source = CGImageSourceCreateWithURL(sourceURL as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary)
  else { throw NSError(domain: "FinishCoachWidgetImage", code: 1) }
  let manager = FileManager.default
  let attributes = try manager.attributesOfItem(atPath: sourceURL.path)
  let modified = Int64(((attributes[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0) * 1000)
  let size = (attributes[.size] as? NSNumber)?.int64Value ?? 0
  let cache = cacheDirectory ?? manager.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("FinishCoachWidgetImages-v1", isDirectory: true)
  try manager.createDirectory(at: cache, withIntermediateDirectories: true)
  let output = cache.appendingPathComponent("\(sourceURL.deletingPathExtension().lastPathComponent)-\(modified)-\(size)-512.png")
  if manager.fileExists(atPath: output.path) { return output }
  let options: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceThumbnailMaxPixelSize: 512,
    kCGImageSourceShouldCacheImmediately: true,
  ]
  guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  else { throw NSError(domain: "FinishCoachWidgetImage", code: 2) }
  let temporary = cache.appendingPathComponent(UUID().uuidString + ".png")
  defer { try? manager.removeItem(at: temporary) }
  guard let destination = CGImageDestinationCreateWithURL(temporary as CFURL, "public.png" as CFString, 1, nil)
  else { throw NSError(domain: "FinishCoachWidgetImage", code: 3) }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination)
  else { throw NSError(domain: "FinishCoachWidgetImage", code: 4) }
  do { try manager.moveItem(at: temporary, to: output) }
  catch { if !manager.fileExists(atPath: output.path) { throw error } }
  NSLog("FinishCoach widget image ready: %dx%d", image.width, image.height)
  return output
}

private func finishCoachRenderProps(_ input: [String: Any]) -> [String: Any] {
  var props = input
  for key in ["image", "neutralImage"] {
    guard let uri = input[key] as? String else { continue }
    do { props[key] = try finishCoachWidgetImage(uri).absoluteString }
    catch {
      props.removeValue(forKey: key)
      NSLog("FinishCoach widget image preparation failed: %@", String(describing: error))
    }
  }
  if props["image"] == nil { props["image"] = props["neutralImage"] }
  return props
}
