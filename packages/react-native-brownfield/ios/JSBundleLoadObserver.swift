import Foundation
internal import React

final class JSBundleLoadObserver {
  private var onBundleLoaded: (() -> Void)?
  private var observerToken: NSObjectProtocol?

  func observeOnce(onBundleLoaded: @escaping () -> Void) {
    removeObserverIfNeeded()
    self.onBundleLoaded = onBundleLoaded

    observerToken = NotificationCenter.default.addObserver(
      forName: NSNotification.Name("RCTInstanceDidLoadBundle"),
      object: nil,
      queue: nil
    ) { [weak self] _ in
      self?.notifyAndClear()
    }
  }

  deinit {
    removeObserverIfNeeded()
  }

  private func notifyAndClear() {
    let callback = onBundleLoaded
    onBundleLoaded = nil
    removeObserverIfNeeded()
    callback?()
  }

  private func removeObserverIfNeeded() {
    if let observerToken {
      NotificationCenter.default.removeObserver(observerToken)
      self.observerToken = nil
    }
  }
}
