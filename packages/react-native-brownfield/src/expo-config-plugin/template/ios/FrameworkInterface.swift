import Foundation
import ReactBrownfield

// Initializes a Bundle instance that points at the framework target.
public let ReactNativeBundle =
  Bundle(identifier: "{{BUNDLE_IDENTIFIER}}")
  ?? Bundle.allFrameworks.first { $0.bundleIdentifier == "{{BUNDLE_IDENTIFIER}}" }
  ?? Bundle(for: InternalClassForBundle.self)

class InternalClassForBundle {}

extension ReactNativeBrownfield {
  public func ensureExpoModulesProvider() {
    let _ = ExpoModulesProvider()
  }
}
