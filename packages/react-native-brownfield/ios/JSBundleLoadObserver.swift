import Foundation

/**
 * Watches the Brownfield timing-ready notification, and calls the callback that waits for it.
 *
 * The timing observer forwards React Native completion to the main thread after capturing
 * timings. This class also delivers callbacks on the main thread for UI updates.
 *
 * The class starts to watch at the initialization, and not at the first callback. The class then
 * knows that React Native loaded the bundle, also if nobody waited for the notification.
 */
final class JSBundleLoadObserver {
  private var pendingCallback: ((JSBundleTimings) -> Void)?
  private var didLoadBundle = false
  private var latestTimings: JSBundleTimings?
  private var observerToken: NSObjectProtocol?

  init() {
    observerToken = NotificationCenter.default.addObserver(
      forName: .JSBundleTimingDidLoad,
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
   * @param onBundleLoaded The class always calls this callback on the main thread, with the
   *   timings of the session that loaded the bundle.
   */
  func observe(onBundleLoaded: @escaping (JSBundleTimings) -> Void) {
    onMainThread { [weak self] in
      self?.register(onBundleLoaded)
    }
  }

  /**
   * Removes the callback that waits, forgets the bundle of the earlier session, and clears stored
   * JS bundle timings. Call this method when you stop React Native. A callback of the earlier
   * session must not run in the next session, and the next session must not reuse the last timings.
   */
  func reset() {
    onMainThread { [weak self] in
      self?.pendingCallback = nil
      self?.didLoadBundle = false
      self?.latestTimings = nil
      JSBundleTimingObserver.reset()
    }
  }

  // MARK: - Main thread only

  private func register(_ onBundleLoaded: @escaping (JSBundleTimings) -> Void) {
    guard !didLoadBundle else {
      let timings = latestTimings ?? Self.snapshotTimings()
      DispatchQueue.main.async {
        onBundleLoaded(timings)
      }
      return
    }

    pendingCallback = onBundleLoaded
  }

  private func bundleDidLoad() {
    didLoadBundle = true
    latestTimings = Self.snapshotTimings()

    let callback = pendingCallback
    pendingCallback = nil

    if let callback, let timings = latestTimings {
      callback(timings)
    }
  }

  /**
   * The timing observer posts our notification only after storing the snapshot. This avoids
   * depending on NotificationCenter observer ordering, including for late registrations.
   */
  private static func snapshotTimings() -> JSBundleTimings {
    JSBundleTimings(
      loadMs: JSBundleTimingObserver.loadMs,
      executeMs: JSBundleTimingObserver.executeMs,
      instanceInitMs: JSBundleTimingObserver.instanceInitMs
    )
  }

  private func onMainThread(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async(execute: work)
    }
  }
}
