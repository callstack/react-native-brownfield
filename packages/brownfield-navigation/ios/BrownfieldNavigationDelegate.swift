import Foundation

@objc public protocol BrownfieldNavigationDelegate: AnyObject {
    @objc func navigateToSettings()
    @objc func navigateToReferrals(_ userId: String)
}
