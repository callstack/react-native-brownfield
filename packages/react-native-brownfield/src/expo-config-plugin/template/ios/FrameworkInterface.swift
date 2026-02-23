// Export helpers from @callstack/react-native-brownfield library
import Foundation
@_exported import ReactBrownfield

// Initializes a Bundle instance that points at the framework target.
public let ReactNativeBundle = Bundle(for: InternalClassForBundle.self)

class InternalClassForBundle {}

extension ReactNativeBrownfield {
  public func ensureExpoModulesProvider() {
    let _ = ExpoModulesProvider()
  }
}
