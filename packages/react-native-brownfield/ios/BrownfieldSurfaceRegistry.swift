import Foundation

/// Identifies one live React Native surface. Vended by `BrownfieldSurfaceRegistry`.
struct BrownfieldSurfaceID: Hashable, CustomStringConvertible {
  fileprivate let rawValue: UInt64

  var description: String { "surface#\(rawValue)" }
}

/// Decides which React Native surface may act on a `popToNative()` request.
///
/// `popToNative()` is delivered as an app-wide notification, so every live React
/// Native surface receives it — including ones buried under other screens. Acting
/// on all of them tears down the whole navigation stack
/// (https://github.com/callstack/react-native-brownfield/issues/354).
///
/// The registry resolves that to a single surface: whichever on-screen surface
/// was shown most recently.
///
/// Visibility is asked for at query time instead of being cached from lifecycle
/// callbacks. Hosts recreate view controllers — SwiftUI does it freely — and a
/// cached flag is stale exactly when the notification arrives.
///
/// Deliberately free of UIKit so it can be unit tested on macOS via `swift test`.
/// Internal, like the sibling `BrownfieldBundleSupport` target: it is an
/// implementation detail of the pod, not API for host apps.
final class BrownfieldSurfaceRegistry {
  static let shared = BrownfieldSurfaceRegistry()

  private struct Surface {
    let isOnScreen: () -> Bool
    var shownAt: UInt64
  }

  private let lock = NSLock()
  private var nextSurfaceValue: UInt64 = 0
  private var nextShownValue: UInt64 = 0
  private var surfaces: [BrownfieldSurfaceID: Surface] = [:]

  init() {}

  /// - Parameter isOnScreen: queried on every `popTarget()`. Capture the host
  ///   weakly so a released surface stops winning the election.
  func register(isOnScreen: @escaping () -> Bool) -> BrownfieldSurfaceID {
    lock.lock()
    defer { lock.unlock() }

    nextSurfaceValue += 1
    let id = BrownfieldSurfaceID(rawValue: nextSurfaceValue)
    surfaces[id] = Surface(isOnScreen: isOnScreen, shownAt: 0)
    return id
  }

  func unregister(_ surface: BrownfieldSurfaceID) {
    lock.lock()
    defer { lock.unlock() }

    surfaces.removeValue(forKey: surface)
  }

  /// Records that a surface was just shown, ordering it ahead of other on-screen
  /// surfaces. Only a tiebreaker — a surface never marked shown can still win
  /// when it is the one on screen.
  func markShown(_ surface: BrownfieldSurfaceID) {
    lock.lock()
    defer { lock.unlock() }

    guard var entry = surfaces[surface] else { return }

    nextShownValue += 1
    entry.shownAt = nextShownValue
    surfaces[surface] = entry
  }

  /// The single surface allowed to handle `popToNative()`, or `nil` when no
  /// React Native surface is on screen.
  func popTarget() -> BrownfieldSurfaceID? {
    lock.lock()
    let candidates = surfaces
    lock.unlock()

    return candidates
      .filter { $0.value.isOnScreen() }
      .max { lhs, rhs in
        (lhs.value.shownAt, lhs.key.rawValue) < (rhs.value.shownAt, rhs.key.rawValue)
      }?
      .key
  }

  func isPopTarget(_ surface: BrownfieldSurfaceID) -> Bool {
    popTarget() == surface
  }
}
