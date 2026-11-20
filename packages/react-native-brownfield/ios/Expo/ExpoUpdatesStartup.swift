#if canImport(EXUpdates)
import Foundation
internal import EXUpdates

final class ExpoUpdatesStartup: NSObject {
  private var updatesReady = false
  private var updatesCallbacks: [() -> Void] = []

  // Updates belongs to the application lifetime, not to a view or React Host session.
  // Inactive controllers (including DevLauncherAppController) must never be started here.
  func prepareReactNative(_ completion: @escaping () -> Void) {
    if !Thread.isMainThread {
      DispatchQueue.main.async { [weak self] in self?.prepareReactNative(completion) }
      return
    }
    AppController.initializeWithoutStarting()
    let controller = AppController.sharedInstance
    guard controller.isActiveController else { completion(); return }
    // expo-updates 57 traps in launchAssetUrl() until start() sets its startup procedure.
    if updatesReady || (controller.isStarted && Self.hasFinishedLaunching(controller)) {
      completion()
      return
    }
    updatesCallbacks.append(completion)
    controller.delegate = self
    if !controller.isStarted {
      controller.start()
    } else if Self.hasFinishedLaunching(controller) {
      releaseCallbacks()
    }
  }

  func cancelPendingRequests() { updatesCallbacks.removeAll() }

  private func releaseCallbacks() {
    updatesReady = true
    let callbacks = updatesCallbacks
    updatesCallbacks.removeAll()
    callbacks.forEach { $0() }
  }

  private static func hasFinishedLaunching(_ controller: InternalAppControllerInterface) -> Bool {
    if controller.launchAssetUrl() != nil {
      return true
    }
    let constants = controller.getConstantsForModule().toModuleConstantsMap()
    return (constants["launchDuration"] ?? nil) != nil
  }
}
#endif

#if canImport(EXUpdates)
extension ExpoUpdatesStartup: AppControllerDelegate {
  func appController(_ appController: any AppControllerInterface, didStartWithSuccess success: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if !success {
        NSLog("%@", "Expo Updates failed to select a launch asset; using the bundle resolver fallback.")
      }
      self.releaseCallbacks()
    }
  }
}
#endif
