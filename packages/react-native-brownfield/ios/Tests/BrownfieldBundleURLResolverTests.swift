import XCTest
@testable import BrownfieldBundleSupport

final class BrownfieldBundleURLResolverTests: XCTestCase {
  func test_debugResolutionPrefersBundledResourceWhenEnabled() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferBundledBundleInDebug: true,
      bundlePath: "main.jsbundle",
      bundle: .module,
      bundleURLOverride: nil,
      metroURL: { metroURL }
    )

    XCTAssertNotNil(resolvedURL)
    XCTAssertEqual(resolvedURL?.lastPathComponent, "main.jsbundle")
    XCTAssertNotEqual(resolvedURL, metroURL)
  }

  func test_debugResolutionUsesMetroByDefault() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferBundledBundleInDebug: false,
      bundlePath: "main.jsbundle",
      bundle: .module,
      bundleURLOverride: nil,
      metroURL: { metroURL }
    )

    XCTAssertEqual(resolvedURL, metroURL)
  }

  func test_releaseResolutionUsesBundledResource() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: false,
      preferBundledBundleInDebug: false,
      bundlePath: "main.jsbundle",
      bundle: .module,
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

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferBundledBundleInDebug: false,
      bundlePath: "main.jsbundle",
      bundle: .module,
      bundleURLOverride: { overrideURL },
      metroURL: { metroURL }
    )

    XCTAssertEqual(resolvedURL, overrideURL)
  }

  func test_bundleURLOverrideFallsBackWhenItReturnsNil() throws {
    let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios")!

    let resolvedURL = try BrownfieldBundleURLResolver.resolve(
      isDebug: true,
      preferBundledBundleInDebug: true,
      bundlePath: "main.jsbundle",
      bundle: .module,
      bundleURLOverride: { nil },
      metroURL: { metroURL }
    )

    XCTAssertNotNil(resolvedURL)
    XCTAssertEqual(resolvedURL?.lastPathComponent, "main.jsbundle")
    XCTAssertNotEqual(resolvedURL, metroURL)
  }

  func test_invalidBundlePathThrows() {
    XCTAssertThrowsError(
      try BrownfieldBundleURLResolver.resolve(
        isDebug: false,
        preferBundledBundleInDebug: false,
        bundlePath: "mainjsbundle",
        bundle: .module,
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
}
