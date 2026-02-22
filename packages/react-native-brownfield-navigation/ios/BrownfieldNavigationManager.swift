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
    return self.navigationDelegate!
  }
}
