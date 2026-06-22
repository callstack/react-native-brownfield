import XCTest
@testable import BrownfieldBundleSupport

final class BrownfieldBundleURLResolverTests: XCTestCase {
  func test_debugResolutionUsesMetroWhenAvailableWithBundledFallbackEnabled() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    let bundle = try makeFixtureBundle()

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferEmbeddedBundleInDebug: true,
      bundlePath: "main.jsbundle",
      bundle: bundle,
      bundleURLOverride: nil,
      metroURL: { metroURL }
    )

    XCTAssertEqual(resolvedURL, metroURL)
  }

  func test_debugResolutionFallsBackToBundledResourceWhenMetroIsUnavailable() throws {
    let bundle = try makeFixtureBundle()

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferEmbeddedBundleInDebug: true,
      bundlePath: "main.jsbundle",
      bundle: bundle,
      bundleURLOverride: nil,
      metroURL: { nil }
    )

    XCTAssertNotNil(resolvedURL)
    XCTAssertEqual(resolvedURL?.lastPathComponent, "main.jsbundle")
  }

  func test_debugResolutionUsesMetroByDefault() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    let bundle = try makeFixtureBundle()

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferEmbeddedBundleInDebug: false,
      bundlePath: "main.jsbundle",
      bundle: bundle,
      bundleURLOverride: nil,
      metroURL: { metroURL }
    )

    XCTAssertEqual(resolvedURL, metroURL)
  }

  func test_releaseResolutionUsesBundledResource() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    let bundle = try makeFixtureBundle()

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: false,
      preferEmbeddedBundleInDebug: false,
      bundlePath: "main.jsbundle",
      bundle: bundle,
      bundleURLOverride: nil,
      metroURL: { metroURL }
    )

    XCTAssertNotNil(resolvedURL)
    XCTAssertEqual(resolvedURL?.lastPathComponent, "main.jsbundle")
    XCTAssertNotEqual(resolvedURL, metroURL)
  }

  func test_bundleURLOverrideTakesPrecedenceWhenItReturnsAURL() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    let overrideURL = URL(string: "https://example.com/custom.bundle")!
    let bundle = try makeFixtureBundle()

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferEmbeddedBundleInDebug: false,
      bundlePath: "main.jsbundle",
      bundle: bundle,
      bundleURLOverride: { overrideURL },
      metroURL: { metroURL }
    )

    XCTAssertEqual(resolvedURL, overrideURL)
  }

  func test_bundleURLOverrideFallsBackWhenItReturnsNil() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    let bundle = try makeFixtureBundle()

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferEmbeddedBundleInDebug: true,
      bundlePath: "main.jsbundle",
      bundle: bundle,
      bundleURLOverride: { nil },
      metroURL: { metroURL }
    )

    XCTAssertEqual(resolvedURL, metroURL)
  }

  func test_invalidBundlePathThrows() {
    XCTAssertThrowsError(
      try BrownfieldBundleURLResolver.resolve(
        isDebug: false,
        preferEmbeddedBundleInDebug: false,
        bundlePath: "mainjsbundle",
        bundle: Bundle(for: Self.self),
        bundleURLOverride: nil,
        metroURL: { nil }
      )
    ) { error in
      guard case let BrownfieldBundlePathResolver.Error.invalidBundlePath(bundlePath) = error else {
        return XCTFail("Expected invalid bundle path error, got \(error)")
      }

      XCTAssertEqual(bundlePath, "mainjsbundle")
    }
  }

  private func makeFixtureBundle() throws -> Bundle {
    let fileManager = FileManager.default
    let bundleURL = fileManager.temporaryDirectory
      .appendingPathComponent("BrownfieldBundleFixture-\(UUID().uuidString).bundle")
    let contentsURL = bundleURL.appendingPathComponent("Contents")
    let resourcesURL = contentsURL.appendingPathComponent("Resources")
    let plistURL = contentsURL.appendingPathComponent("Info.plist")
    let fixtureURL = resourcesURL.appendingPathComponent("main.jsbundle")

    try fileManager.createDirectory(at: resourcesURL, withIntermediateDirectories: true)

    let plist = """
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>CFBundleIdentifier</key>
      <string>com.callstack.BrownfieldBundleFixture</string>
      <key>CFBundleName</key>
      <string>BrownfieldBundleFixture</string>
      <key>CFBundlePackageType</key>
      <string>BNDL</string>
      <key>CFBundleVersion</key>
      <string>1</string>
    </dict>
    </plist>
    """

    try plist.write(to: plistURL, atomically: true, encoding: .utf8)
    try "console.log(\"fixture\");".write(to: fixtureURL, atomically: true, encoding: .utf8)

    addTeardownBlock {
      try? fileManager.removeItem(at: bundleURL)
    }

    guard let bundle = Bundle(url: bundleURL) else {
      throw NSError(
        domain: "BrownfieldBundleURLResolverTests",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Failed to create fixture bundle"]
      )
    }

    return bundle
  }
}
