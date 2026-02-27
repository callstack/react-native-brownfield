//
//  BrownfieldNavigationManager.swift
//
//  Created by Hur Ali on 10/02/2026.
//

public class BrownfieldNavigationManager: NSObject {
  @objc public static let shared = BrownfieldNavigationManager()
  private var navigationDelegate: BrownfieldNavigationDelegate?

  public func setDelegate(navigationDelegate: BrownfieldNavigationDelegate) {
    self.navigationDelegate = navigationDelegate
  }
  
  @objc public func getDelegate() -> BrownfieldNavigationDelegate {
    guard let delegate = navigationDelegate else {
      fatalError("BrownfieldNavigationDelegate not set. Call setDelegate() before using navigation.")
    }
    return delegate
  }
}
