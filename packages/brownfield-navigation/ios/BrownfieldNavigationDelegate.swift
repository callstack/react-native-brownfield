import Foundation
import React

@objc public protocol BrownfieldNavigationDelegate: AnyObject {
    @objc func navigateToSettings(_ user: UserType)
    @objc func navigateToReferrals(_ userId: String)
    @objc func requestNativeConfirmation(_ title: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock)
    @objc func showNativeBanner(_ message: String, onDismiss onDismiss: @escaping RCTResponseSenderBlock)
}
