import UIKit
internal import React

@objc public class ReactNativeViewController: UIViewController {
  private var moduleName: String
  private var initialProperties: [String: Any]?
  /// Identifies this surface in `BrownfieldSurfaceRegistry`, which decides
  /// which single surface may act on `popToNative()`.
  private var surfaceID: BrownfieldSurfaceID?

  /// Set by `ReactNativeView`. SwiftUI owns its navigation state, so an
  /// imperative `popViewController` is reverted; the SwiftUI host dismisses
  /// instead and this controller stands down.
  internal var isHostedBySwiftUI = false

  /// True from the start of a disappearance transition until the surface next
  /// appears. `view.window` stays non-nil for the whole animation, so this is
  /// what distinguishes "the host already dismissed us" from "nothing happened".
  private var isDisappearing = false

  /// Whether this surface is the one allowed to act on `popToNative()`.
  internal var isPopTarget: Bool {
    guard let surfaceID else { return false }
    return BrownfieldSurfaceRegistry.shared.isPopTarget(surfaceID)
  }
  private var waitForFullDisplay = false
  private var collectThreadMetrics = false
  private var onMetrics: ((BrownfieldDisplayMetrics) -> Void)?
  private var displaySession: BrownfieldDisplaySession?
  private var isVisible = false


  @objc public init(moduleName: String, initialProperties: [String: Any]? = nil) {
    self.moduleName = moduleName
    self.initialProperties = initialProperties
    super.init(nibName: nil, bundle: nil)
  }

  @objc public convenience init(moduleName: String, initialProperties: [String: Any]? = nil,
                                waitForFullDisplay: Bool = false,
                                collectThreadMetrics: Bool = false,
                                onMetrics: ((BrownfieldDisplayMetrics) -> Void)?) {
    self.init(moduleName: moduleName, initialProperties: initialProperties)
    self.waitForFullDisplay = waitForFullDisplay
    self.collectThreadMetrics = collectThreadMetrics
    self.onMetrics = onMetrics
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func viewDidLoad() {
    super.viewDidLoad()
    displaySession = BrownfieldDisplaySession(moduleName: moduleName,
      waitForFullDisplay: waitForFullDisplay, collectThreadMetrics: collectThreadMetrics,
      callback: onMetrics)
    onMetrics = nil

    if !moduleName.isEmpty {
      renderReactNativeView()

      // Visibility is resolved live: SwiftUI recreates hosted controllers, so a
      // cached lifecycle flag is stale when the notification arrives.
      surfaceID = BrownfieldSurfaceRegistry.shared.register { [weak self] in
        self?.viewIfLoaded?.window != nil
      }
        
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(togglePopGestureRecognizer(_:)),
        name: NSNotification.Name.togglePopGestureRecognizer,
        object: nil
      )

      NotificationCenter.default.addObserver(
        self,
        selector: #selector(popToNative(_:)),
        name: NSNotification.Name.popToNative,
        object: nil
      )
    }
  }

  public override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)

    isDisappearing = false

    // Ordered here rather than in `viewDidAppear`: during a modal presentation
    // the covered surface is still in a window, so waiting for `viewDidAppear`
    // would let it out-rank the surface being presented over it.
    if let surfaceID {
      BrownfieldSurfaceRegistry.shared.markShown(surfaceID)
    }
  }

  public override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)

    isDisappearing = true
  }

  public override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    isVisible = true
    // Expo Updates may not have created the RN root yet.
    if view.subviews.contains(where: { $0 is BrownfieldAppearanceProbe }) {
      displaySession?.appeared()
    }
  }

  public override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    isVisible = false
    displaySession?.cancel()
  }

  deinit {
    displaySession?.cancel()
    NotificationCenter.default.removeObserver(self)

    if let surfaceID {
      BrownfieldSurfaceRegistry.shared.unregister(surfaceID)
    }
  }

  @objc private func togglePopGestureRecognizer(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let enabled = userInfo["enabled"] as? Bool else { return }

    DispatchQueue.main.async { [weak self] in
      self?.navigationController?.interactivePopGestureRecognizer?.isEnabled = enabled
    }
  }

  @objc private func popToNative(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let animated = userInfo["animated"] as? Bool else { return }

    // `.popToNative` is public API, so a host may post it from any thread.
    // Everything below reads UIKit state — including the registry's visibility
    // check — so hop to main first.
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }

      // The notification is app-wide, so every live surface receives it. Only
      // the topmost visible one may act, otherwise surfaces buried under other
      // screens tear down the whole navigation stack.
      // https://github.com/callstack/react-native-brownfield/issues/354
      let target = BrownfieldSurfaceRegistry.shared.popTarget()

      guard let surfaceID = self.surfaceID, target == surfaceID else {
        if target == nil {
          NSLog("[ReactBrownfield] popToNative(): no React Native surface is on screen; ignoring.")
        }
        return
      }

      guard self.isHostedBySwiftUI else {
        self.popFromNativeNavigationStack(animated: animated)
        return
      }

      // SwiftUI owns its navigation state and reverts an imperative pop, so the
      // SwiftUI host dismisses instead. It cannot always succeed though — a
      // `ReactNativeView` inside a `UIHostingController` pushed onto a UIKit
      // navigation stack has nothing for `dismiss()` to act on. Give the host a
      // moment, then fall back, so `popToNative()` is never silently inert.
      //
      // `isDisappearing` — not the delay — is what makes this safe: a dismiss
      // that is merely slow has already begun its transition by the time this
      // runs, so a late timer stands down instead of popping a second entry.
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        guard let self,
              !self.isDisappearing,
              self.viewIfLoaded?.window != nil,
              // Re-established: the entitlement was resolved before the wait.
              self.isPopTarget else { return }

        self.popFromNativeNavigationStack(animated: animated)
      }
    }
  }

  /// Pops this surface off the host's `UINavigationController`.
  ///
  /// Deliberately does not fall back to `dismiss()` when there is no navigation
  /// stack: `presentingViewController` is inherited, so an inline surface hosted
  /// inside a presented native screen would tear down that whole screen — the
  /// same over-dismissal this fix exists to prevent.
  private func popFromNativeNavigationStack(animated: Bool) {
    guard let navigationController else { return }

    // This controller is usually a child of a host controller (SwiftUI wraps it
    // in one), so find the stack entry containing it rather than assuming it is
    // itself on the stack — and pop to the entry below that, so a screen pushed
    // while we were waiting is not the one that gets popped.
    let stack = navigationController.viewControllers
    guard let index = stack.firstIndex(where: { $0 === self || self.isDescendant(of: $0) }),
          index > 0 else { return }

    navigationController.popToViewController(stack[index - 1], animated: animated)
  }

  private func isDescendant(of controller: UIViewController) -> Bool {
    var ancestor = parent

    while let current = ancestor {
      if current === controller { return true }
      ancestor = current.parent
    }

    return false
  }

  private func renderReactNativeView() {
    guard !moduleName.isEmpty else { return }
    
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      guard let session = self.displaySession else { return }
      guard let reactView = ReactNativeBrownfield.shared.makeView(
        moduleName: self.moduleName,
        initialProps: self.initialProperties,
        launchOptions: nil,
        session: session,
        controllerAppearance: true
      ) else { return }
      self.view = reactView
      if self.isVisible { session.appeared() }
    }
  }
}
