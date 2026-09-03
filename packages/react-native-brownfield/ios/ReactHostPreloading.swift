import Foundation

/**
 * The preload state that `startReactNative`, `view` and `stopReactNative` share.
 */
final class ReactHostPreloadState {
  let jsBundleLoadObserver = JSBundleLoadObserver()

  private let lock = NSLock()
  private var storedLaunchOptions: [AnyHashable: Any]?
  private var hasPreloadRequest = false

  /**
   * Keeps the launch options of a `startReactNative` call.
   *
   * `startReactNative` can move its preload work to the main thread. A view on the main thread can
   * create the React Host before that. Thus this method must run at the call, and not after the
   * change of thread. The view then finds the options.
   */
  func storeLaunchOptions(_ launchOptions: [AnyHashable: Any]?) {
    guard let launchOptions else { return }

    lock.lock()
    defer { lock.unlock() }

    storedLaunchOptions = launchOptions
  }

  /**
   * Records that a `startReactNative` call must preload the bundle. `consumePreloadRequest` reads
   * the request one time, and `reset` cancels it.
   */
  func requestPreload() {
    lock.lock()
    defer { lock.unlock() }

    hasPreloadRequest = true
  }

  /**
   * `true` if a preload request waits. The method also removes the request.
   *
   * `startReactNative` can move its preload work to the main thread. `stopReactNative` on the main
   * thread can run before that work. The stop cancels the request, thus this method then gives
   * `false`, and React Native stays stopped.
   */
  func consumePreloadRequest() -> Bool {
    lock.lock()
    defer { lock.unlock() }

    let hadRequest = hasPreloadRequest
    hasPreloadRequest = false

    return hadRequest
  }

  /**
   * The launch options for a call that can create the React Host. The options of the caller win
   * over the options of an earlier `startReactNative` call.
   */
  func launchOptions(
    overriddenBy explicitLaunchOptions: [AnyHashable: Any]? = nil
  ) -> [AnyHashable: Any]? {
    lock.lock()
    defer { lock.unlock() }

    return explicitLaunchOptions ?? storedLaunchOptions
  }

  /**
   * Removes the state of the session. Call this method when you stop React Native.
   */
  func reset() {
    jsBundleLoadObserver.reset()

    lock.lock()
    defer { lock.unlock() }

    storedLaunchOptions = nil
    hasPreloadRequest = false
  }
}

/**
 * The preload sequence that the two host runtimes share. Only one runtime is in a build. The
 * shared sequence keeps the behavior of the two runtimes equal.
 */
protocol ReactHostPreloading: AnyObject {
  var preloadState: ReactHostPreloadState { get }

  /**
   * The React Native factory, or nil while React Native did not start. The type is `AnyObject`,
   * because `BrownfieldReactHostPreloader` also takes the factory as `id`. This file then needs no
   * React Native import, and it builds with both runtimes.
   */
  var reactNativeFactoryForPreload: AnyObject? { get }

  func startReactNative()

  /**
   * `false` while the bundle URL can still change. The runtime must not create the host in this
   * condition, because the host keeps the first bundle that it evaluates.
   */
  func canPreloadReactNative() -> Bool

  func prepareDevLoadingView()
}

extension ReactHostPreloading {
  /**
   * The implementation of
   * `ReactNativeBrownfield.startReactNative(launchOptions:preloadBundle:onBundleLoaded:)`, which
   * holds the contract.
   */
  func startReactNative(
    launchOptions: [AnyHashable: Any]?,
    preloadBundle: Bool,
    onBundleLoaded: (() -> Void)?
  ) {
    preloadState.storeLaunchOptions(launchOptions)

    if let onBundleLoaded {
      preloadState.jsBundleLoadObserver.observe(onBundleLoaded: onBundleLoaded)
    }

    guard preloadBundle else {
      startReactNative()
      return
    }

    preloadState.requestPreload()

    if Thread.isMainThread {
      createReactHost()
    } else {
      DispatchQueue.main.async { [weak self] in
        self?.createReactHost()
      }
    }
  }

  private func createReactHost() {
    // `stopReactNative` can run between the request and this method, because a caller that is not
    // on the main thread moves the work to the main thread. The stop cancels the request, and
    // React Native must then stay stopped.
    guard preloadState.consumePreloadRequest() else { return }

    startReactNative()

    guard let factory = reactNativeFactoryForPreload else {
      logSkippedPreload("React Native did not make the factory")
      return
    }

    guard canPreloadReactNative() else {
      logSkippedPreload("the bundle URL can still change")
      return
    }

    // You must configure the dev loading view before React Native loads the bundle. Usually the
    // `view` method does this.
    prepareDevLoadingView()

    BrownfieldReactHostPreloader.preload(
      withReactNativeFactory: factory,
      launchOptions: preloadState.launchOptions()
    )
  }

  private func logSkippedPreload(_ reason: String) {
    NSLog(
      "%@",
      "ReactNativeBrownfield: startReactNative did not preload the JavaScript bundle, because "
        + reason + ". The first React Native view loads the bundle."
    )
  }
}
