import Foundation

/**
 * Watches the `RCTInstanceDidLoadBundle` notification, and calls the callback that waits for it.
 *
 * React Native sends the notification from the JavaScript thread. This class always calls the
 * callback on the main thread, because the callback changes the user interface.
 *
 * The class starts to watch at the initialization, and not at the first callback. The class then
 * knows that React Native loaded the bundle, also if nobody waited for the notification.
 */
final class JSBundleLoadObserver {
  private var pendingCallback: (() -> Void)?
  private var didLoadBundle = false
  private var observerToken: NSObjectProtocol?

  init() {
    observerToken = NotificationCenter.default.addObserver(
      forName: NSNotification.Name("RCTInstanceDidLoadBundle"),
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.bundleDidLoad()
    }
  }

  deinit {
    if let observerToken {
      NotificationCenter.default.removeObserver(observerToken)
    }
  }

  /**
   * Keeps one callback, and calls it one time. A new callback replaces the callback that waits. If
   * React Native already loaded the bundle, the class calls the callback in the next turn of the
   * main run loop.
   *
   * @param onBundleLoaded The class always calls this callback on the main thread.
   */
  func observe(onBundleLoaded: @escaping () -> Void) {
    onMainThread { [weak self] in
      self?.register(onBundleLoaded)
    }
  }

  /**
   * Removes the callback that waits, and forgets the bundle of the earlier session. Call this
   * method when you stop React Native. A callback of the earlier session must not run in the next
   * session.
   */
  func reset() {
    onMainThread { [weak self] in
      self?.pendingCallback = nil
      self?.didLoadBundle = false
    }
  }

  // MARK: - Main thread only

  private func register(_ onBundleLoaded: @escaping () -> Void) {
    guard !didLoadBundle else {
      DispatchQueue.main.async(execute: onBundleLoaded)
      return
    }

    pendingCallback = onBundleLoaded
  }

  private func bundleDidLoad() {
    didLoadBundle = true

    let callback = pendingCallback
    pendingCallback = nil

    callback?()
  }

  private func onMainThread(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async(execute: work)
    }
  }
}
