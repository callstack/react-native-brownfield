import XCTest
@testable import BrownfieldNavigationSupport

/// `popToNative()` is delivered as an app-wide notification, so every live React
/// Native surface hears it. These tests pin down which single surface may act.
///
/// Visibility is supplied as a live closure rather than tracked state: the host
/// recreates view controllers (SwiftUI does this freely), so cached lifecycle
/// flags go stale exactly when the notification arrives.
///
/// Regression cover for https://github.com/callstack/react-native-brownfield/issues/354
final class BrownfieldSurfaceRegistryTests: XCTestCase {
  /// Stands in for a React Native surface's `view.window != nil` check.
  private final class FakeSurface {
    var isOnScreen = false
  }

  func test_noRegisteredSurfacesHaveNoPopTarget() {
    let registry = BrownfieldSurfaceRegistry()

    XCTAssertNil(registry.popTarget())
  }

  func test_offScreenSurfaceIsNotThePopTarget() {
    let registry = BrownfieldSurfaceRegistry()
    let surface = FakeSurface()
    let id = registry.register { surface.isOnScreen }

    XCTAssertNil(registry.popTarget())
    XCTAssertFalse(registry.isPopTarget(id))
  }

  func test_theOnlyOnScreenSurfaceIsThePopTarget() {
    let registry = BrownfieldSurfaceRegistry()
    let surface = FakeSurface()
    let id = registry.register { surface.isOnScreen }
    surface.isOnScreen = true

    XCTAssertEqual(registry.popTarget(), id)
    XCTAssertTrue(registry.isPopTarget(id))
  }

  /// The reporter's stack: RN "Home" is pushed first, covered by a native screen,
  /// then RN "Contact" is pushed on top. Home stays alive and still observes the
  /// notification, but must not pop — that is what destroys the whole stack.
  func test_coveredSurfaceIsNotThePopTargetWhenAnotherIsOnScreen() {
    let registry = BrownfieldSurfaceRegistry()
    let home = FakeSurface()
    let contact = FakeSurface()
    let homeID = registry.register { home.isOnScreen }
    let contactID = registry.register { contact.isOnScreen }

    home.isOnScreen = false
    contact.isOnScreen = true

    XCTAssertEqual(registry.popTarget(), contactID)
    XCTAssertFalse(registry.isPopTarget(homeID))
  }

  /// The failure that made the first fix inert: the top surface had been
  /// registered but its appearance callback had not run yet when the
  /// notification arrived. A live visibility check still resolves it.
  func test_onScreenSurfaceIsThePopTargetEvenIfItWasNeverMarkedShown() {
    let registry = BrownfieldSurfaceRegistry()
    let covered = FakeSurface()
    let top = FakeSurface()
    let coveredID = registry.register { covered.isOnScreen }
    registry.markShown(coveredID)
    covered.isOnScreen = false

    let topID = registry.register { top.isOnScreen }
    top.isOnScreen = true

    XCTAssertEqual(registry.popTarget(), topID)
  }

  func test_surfaceBecomesThePopTargetAgainOnceTheSurfaceAboveItGoesAway() {
    let registry = BrownfieldSurfaceRegistry()
    let home = FakeSurface()
    let contact = FakeSurface()
    let homeID = registry.register { home.isOnScreen }
    let contactID = registry.register { contact.isOnScreen }

    contact.isOnScreen = true
    registry.unregister(contactID)
    home.isOnScreen = true

    XCTAssertEqual(registry.popTarget(), homeID)
  }

  func test_unregisteredSurfaceIsNeverThePopTarget() {
    let registry = BrownfieldSurfaceRegistry()
    let surface = FakeSurface()
    let id = registry.register { surface.isOnScreen }
    surface.isOnScreen = true
    registry.unregister(id)

    XCTAssertNil(registry.popTarget())
    XCTAssertFalse(registry.isPopTarget(id))
  }

  /// Two surfaces on screen at once (an inline React Native card on a native host
  /// screen, plus a pushed full-screen experience). Only the most recently shown
  /// acts, so a single `popToNative()` pops once.
  func test_mostRecentlyShownOnScreenSurfaceWinsWhenSeveralAreVisible() {
    let registry = BrownfieldSurfaceRegistry()
    let inlineCard = FakeSurface()
    let pushedScreen = FakeSurface()
    let inlineID = registry.register { inlineCard.isOnScreen }
    let pushedID = registry.register { pushedScreen.isOnScreen }

    inlineCard.isOnScreen = true
    pushedScreen.isOnScreen = true
    registry.markShown(inlineID)
    registry.markShown(pushedID)

    XCTAssertEqual(registry.popTarget(), pushedID)
    XCTAssertFalse(registry.isPopTarget(inlineID))
  }

  /// Pins `markShown` itself. Every other multi-surface case here registers and
  /// shows in the same order, so registration order alone would reproduce the
  /// expected result; this one shows the *earlier-registered* surface last, and
  /// fails if recency is dropped from the election.
  func test_earlierRegisteredSurfaceWinsWhenItWasShownMoreRecently() {
    let registry = BrownfieldSurfaceRegistry()
    let first = FakeSurface()
    let second = FakeSurface()
    let firstID = registry.register { first.isOnScreen }
    let secondID = registry.register { second.isOnScreen }

    first.isOnScreen = true
    second.isOnScreen = true

    registry.markShown(secondID)
    registry.markShown(firstID)

    XCTAssertEqual(registry.popTarget(), firstID)
    XCTAssertFalse(registry.isPopTarget(secondID))
  }

  /// Pins the registry's contract — a surface whose visibility closure stops
  /// reporting true drops out of the election. It does not, and cannot here,
  /// verify that `ReactNativeViewController` captures itself weakly; that is
  /// UIKit-side and covered by the end-to-end test.
  func test_deallocatedSurfaceIsNotThePopTarget() {
    let registry = BrownfieldSurfaceRegistry()
    var transient: FakeSurface? = FakeSurface()
    transient?.isOnScreen = true
    let id = registry.register { [weak transient] in transient?.isOnScreen ?? false }
    registry.markShown(id)

    transient = nil

    XCTAssertNil(registry.popTarget())
  }
}
