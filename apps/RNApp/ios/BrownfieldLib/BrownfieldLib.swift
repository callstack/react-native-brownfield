// Export helpers from @callstack/react-native-brownfield library.
// Brownie is not re-exported here to avoid duplicating it inside BrownfieldLib.framework.
@_exported import ReactBrownfield
// Initializes a Bundle instance that points at the framework target.
public let ReactNativeBundle = Bundle(for: InternalClassForBundle.self)
class InternalClassForBundle {}
