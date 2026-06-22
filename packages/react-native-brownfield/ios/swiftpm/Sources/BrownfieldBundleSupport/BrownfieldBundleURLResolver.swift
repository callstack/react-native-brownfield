import Foundation

final class BrownfieldBundleURLResolver {
  private init() {}

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

    let (resourceName, fileExtension) = try BrownfieldBundlePathResolver.resourceComponents(
      from: bundlePath
    )

    let embeddedBundleURL = bundle.url(forResource: resourceName, withExtension: fileExtension)

    if isDebug {
      if preferEmbeddedBundleInDebug {
        return metroURL() ?? embeddedBundleURL
      }

      return metroURL()
    }

    return embeddedBundleURL
  }
}
