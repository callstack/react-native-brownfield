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
    if updatesReady || controller.launchAssetUrl() != nil {
      completion()
      return
    }
    updatesCallbacks.append(completion)
    controller.delegate = self
    if !controller.isStarted {
      controller.start()
    }
  }

  func cancelPendingRequests() { updatesCallbacks.removeAll() }
}
#endif

#if canImport(EXUpdates)
extension ExpoUpdatesStartup: AppControllerDelegate {
  func appController(_ appController: any AppControllerInterface, didStartWithSuccess success: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.updatesReady = true
      if !success {
        NSLog("%@", "Expo Updates failed to select a launch asset; using the bundle resolver fallback.")
      }
      let callbacks = self.updatesCallbacks
      self.updatesCallbacks.removeAll()
      callbacks.forEach { $0() }
    }
  }
}
#endif
