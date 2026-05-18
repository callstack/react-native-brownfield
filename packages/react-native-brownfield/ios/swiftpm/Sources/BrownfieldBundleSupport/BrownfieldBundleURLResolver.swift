import Foundation

enum BrownfieldBundleURLResolver {
  static func resolve(
    isDebug: Bool,
    preferEmbeddedBundleInDebug: Bool,
    bundlePath: String,
    bundle: Bundle,
    bundleURLOverride: (() -> URL?)?,
    metroURL: () -> URL?
  ) throws -> URL? {
    if let overriddenURL = bundleURLOverride?() {
      return overriddenURL
    }

    if isDebug && !preferEmbeddedBundleInDebug {
      return metroURL()
    }

    let (resourceName, fileExtension) = try BrownfieldBundlePathResolver.resourceComponents(
      from: bundlePath
    )

    return bundle.url(forResource: resourceName, withExtension: fileExtension)
  }
}
