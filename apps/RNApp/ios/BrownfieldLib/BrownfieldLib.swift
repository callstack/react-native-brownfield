// Export helpers from @callstack/react-native-brownfield library
@_exported import ReactBrownfield
@_exported import Brownie
// Initializes a Bundle instance that points at the framework target.
public let ReactNativeBundle = Bundle(for: InternalClassForBundle.self)
class InternalClassForBundle {}

private struct FrameworkRnAppUser: Codable {
  let name: String
}

private struct FrameworkRnAppBrownfieldStore: BrownieStoreProtocol {
  static let storeName = "BrownfieldStore"

  let counter: Double
  let user: FrameworkRnAppUser
}

public func registerInitialBrownfieldStoreInFramework() {
  FrameworkRnAppBrownfieldStore.register(
    FrameworkRnAppBrownfieldStore(
      counter: 0,
      user: FrameworkRnAppUser(name: "Username")
    )
  )
}
