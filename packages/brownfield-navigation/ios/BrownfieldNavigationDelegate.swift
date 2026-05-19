import Foundation

@objc public protocol BrownfieldNavigationDelegate: AnyObject {
    @objc func navigateToSettings(_ user: UserType)
    @objc func navigateToReferrals(_ userId: String)
}
