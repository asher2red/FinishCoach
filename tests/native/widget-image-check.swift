import Foundation
import ImageIO

@main
struct WidgetImageCheck {
  static func main() throws {
    let cache = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    for input in CommandLine.arguments.dropFirst(2) {
      let sourceURL = URL(fileURLWithPath: input)
      let output = try finishCoachWidgetImage(sourceURL.absoluteString, cacheDirectory: cache)
      let source = CGImageSourceCreateWithURL(output as CFURL, nil)!
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)! as NSDictionary
      let width = properties[kCGImagePropertyPixelWidth] as! Int
      let height = properties[kCGImagePropertyPixelHeight] as! Int
      precondition(width <= 512 && height <= 512, "Bitmap exceeds widget image budget")
      precondition(properties[kCGImagePropertyHasAlpha] as? Bool == true, "Transparency was lost")
      let cached = try finishCoachWidgetImage(sourceURL.absoluteString, cacheDirectory: cache)
      precondition(cached == output, "Repeated renders must reuse the same thumbnail")
      print("PASS \(sourceURL.lastPathComponent): \(width)x\(height), alpha preserved, cache reused")
    }
  }
}
