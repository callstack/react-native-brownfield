#!/usr/bin/env bash
# Exercise the production startup coordinator with an EXUpdates test module on macOS.
set -euo pipefail
package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/brownfield-expo-startup.XXXXXX")"
trap 'rm -rf "$test_dir"' EXIT
cat > "$test_dir/EXUpdates.swift" <<'SWIFT'
import Foundation
public protocol AppControllerInterface {}
public protocol AppControllerDelegate: AnyObject {
  func appController(_ controller: any AppControllerInterface, didStartWithSuccess success: Bool)
}
public final class AppController: AppControllerInterface {
  public static var initialized = false
  public static var controller = AppController()
  public static var sharedInstance: AppController {
    precondition(initialized, "Must initialize before accessing the singleton")
    return controller
  }
  public static func initializeWithoutStarting() { initialized = true }
  public var isActiveController = true
  public var isStarted = false
  public var starts = 0
  public var asset: URL?
  public weak var delegate: (any AppControllerDelegate)?
  public init() {}
  public func launchAssetUrl() -> URL? { asset }
  public func start() {
    precondition(isActiveController, "Cannot start a dev launcher controller")
    precondition(!isStarted, "Cannot start twice")
    isStarted = true
    starts += 1
  }
  public func finish(_ success: Bool = true) {
    if success { asset = URL(fileURLWithPath: "/update.jsbundle") }
    delegate?.appController(self, didStartWithSuccess: success)
  }
}
SWIFT
cat > "$test_dir/main.swift" <<'SWIFT'
import Foundation
internal import EXUpdates
func drain() { RunLoop.main.run(until: Date().addingTimeInterval(0.02)) }
func reset() { AppController.initialized = false; AppController.controller = AppController() }
// Debug dev launcher and disabled Updates: ready immediately, never start.
for _ in 0..<2 {
  reset()
  AppController.controller.isActiveController = false
  let startup = ExpoUpdatesStartup()
  var ready = false
  startup.prepareReactNative { ready = true }
  precondition(ready && AppController.controller.starts == 0)
}
// Preload and simultaneous views share one asynchronous selection.
reset()
let startup = ExpoUpdatesStartup()
var completions = 0
startup.prepareReactNative { completions += 1 }
startup.prepareReactNative { completions += 1 }
precondition(completions == 0 && AppController.controller.starts == 1)
AppController.controller.finish()
drain()
precondition(completions == 2)
startup.prepareReactNative { completions += 1 }
precondition(completions == 3 && AppController.controller.starts == 1)
// Stopping a host cancels its waiters without restarting application-wide Updates.
reset()
let stopped = ExpoUpdatesStartup()
stopped.prepareReactNative { preconditionFailure("Cancelled callback") }
stopped.cancelPendingRequests()
AppController.controller.finish()
drain()
var restarted = false
stopped.prepareReactNative { restarted = true }
precondition(restarted && AppController.controller.starts == 1)
// Failed selection releases waiters so views can use the bundle resolver fallback.
reset()
let failed = ExpoUpdatesStartup()
var fallback = 0
failed.prepareReactNative { fallback += 1 }
AppController.controller.finish(false)
drain()
failed.prepareReactNative { fallback += 1 }
precondition(fallback == 2 && AppController.controller.starts == 1)
// Verify the shared preload path waits, preserves launch options and honors cancellation.
final class JSBundleTimings {}
final class JSBundleLoadObserver {
  func observe(onBundleLoaded: @escaping (JSBundleTimings) -> Void) {}
  func reset() {}
}
enum BrownfieldReactHostPreloader {
  static var loads = 0
  static var options: [AnyHashable: Any]?
  static func preload(withReactNativeFactory: AnyObject, launchOptions: [AnyHashable: Any]?) {
    loads += 1
    options = launchOptions
  }
}
final class Runtime: ReactHostPreloading {
  let preloadState = ReactHostPreloadState()
  let startup = ExpoUpdatesStartup()
  var reactNativeFactoryForPreload: AnyObject?
  func startReactNative() { reactNativeFactoryForPreload = NSObject() }
  func canPreloadReactNative() -> Bool { AppController.controller.asset != nil }
  func prepareReactNative(_ completion: @escaping () -> Void) { startup.prepareReactNative(completion) }
  func prepareDevLoadingView() {}
}
reset()
let runtime = Runtime()
runtime.startReactNative(launchOptions: ["test": 42], preloadBundle: true, onBundleLoaded: nil)
precondition(BrownfieldReactHostPreloader.loads == 0)
AppController.controller.finish()
drain()
precondition(BrownfieldReactHostPreloader.loads == 1)
precondition(BrownfieldReactHostPreloader.options?["test"] as? Int == 42)
reset()
let cancelled = Runtime()
cancelled.startReactNative(launchOptions: nil, preloadBundle: true, onBundleLoaded: nil)
cancelled.preloadState.reset()
AppController.controller.finish()
drain()
precondition(BrownfieldReactHostPreloader.loads == 1)
print("PASS: initialization, inactive controllers, concurrent waiters, remount, stop/restart, failure")
SWIFT
xcrun swiftc -module-cache-path "$test_dir/cache" -emit-library -emit-module -module-name EXUpdates \
  "$test_dir/EXUpdates.swift" -o "$test_dir/libEXUpdates.dylib" \
  -emit-module-path "$test_dir/EXUpdates.swiftmodule"
for optimization in -Onone -O; do
  xcrun swiftc -module-cache-path "$test_dir/cache" "$optimization" -I "$test_dir" -L "$test_dir" -lEXUpdates \
    -Xlinker -rpath -Xlinker "$test_dir" \
    "$package_dir/ios/Expo/ExpoUpdatesStartup.swift" "$package_dir/ios/ReactHostPreloading.swift" "$test_dir/main.swift" -o "$test_dir/test"
  "$test_dir/test"
done
