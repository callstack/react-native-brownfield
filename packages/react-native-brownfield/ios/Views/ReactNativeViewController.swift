import UIKit
internal import React
#if canImport(EXUpdates)
internal import EXUpdates
#endif

@objc public class ReactNativeViewController: UIViewController {
  private var moduleName: String
  private var initialProperties: [String: Any]?
  private var waitForFullDisplay = false
  private var collectThreadMetrics = false
  private var onMetrics: ((BrownfieldDisplayMetrics) -> Void)?
  private var displaySession: BrownfieldDisplaySession?
  private var isVisible = false

#if canImport(EXUpdates)
  private let expoUpdatesDelegate = ReactNativeExpoUpdatesDelegate()
#endif
    

  @objc public init(moduleName: String, initialProperties: [String: Any]? = nil) {
    self.moduleName = moduleName
    self.initialProperties = initialProperties
#if canImport(EXUpdates)
    AppController.sharedInstance.delegate = expoUpdatesDelegate
    AppController.sharedInstance.start()
#endif
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
#if canImport(EXUpdates)
    expoUpdatesDelegate.onDidStart = { [weak self] in
      self?.renderReactNativeView()
    }
#endif

    if !moduleName.isEmpty {
#if !canImport(EXUpdates)
      renderReactNativeView()
#endif
        
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

    DispatchQueue.main.async { [weak self] in
      self?.navigationController?.popViewController(animated: animated)
    }
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

#if canImport(EXUpdates)
private final class ReactNativeExpoUpdatesDelegate: NSObject, AppControllerDelegate {
  private var didStartSuccessfully = false
  var onDidStart: (() -> Void)? {
    didSet {
      if didStartSuccessfully {
        onDidStart?()
      }
    }
  }

  func appController(_ appController: any EXUpdates.AppControllerInterface, didStartWithSuccess success: Bool) {
    guard success else {
      NSLog("%@", "Expo Updates failed to start React Native.")
      return
    }

    didStartSuccessfully = true
    onDidStart?()
  }
}
#endif
