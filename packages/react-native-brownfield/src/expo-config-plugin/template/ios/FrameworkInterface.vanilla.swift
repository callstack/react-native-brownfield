import Foundation

// Re-export the Brownfield runtime so the native host app resolves
// ReactNativeBrownfield.shared by importing only this framework, matching the
// manual guide's interface file (docs getting-started/ios.mdx).
@_exported import ReactBrownfield

// Initializes a Bundle instance that points at the framework target.
public let ReactNativeBundle = Bundle(for: InternalClassForBundle.self)

class InternalClassForBundle {}

