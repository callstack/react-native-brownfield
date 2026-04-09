import UIKit
internal import React
#if canImport(EXUpdates)
internal import EXUpdates
#endif

@objc public class ReactNativeViewController: UIViewController {
  private var moduleName: String
  private var initialProperties: [String: Any]?

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

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func viewDidLoad() {
    super.viewDidLoad()
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

  deinit {
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
      guard let reactView = ReactNativeBrownfield.shared.view(
        moduleName: self.moduleName,
        initialProps: self.initialProperties,
        launchOptions: nil
      ) else { return }
      self.view = reactView
    }
  }
}

private final class ReactNativeExpoUpdatesDelegate: NSObject, AppControllerDelegate {
  var onDidStart: (() -> Void)?

  func appController(_ appController: any EXUpdates.AppControllerInterface, didStartWithSuccess success: Bool) {
      onDidStart?()
  }
}
