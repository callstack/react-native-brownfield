import Foundation
import Combine
import SwiftUI

extension Notification.Name {
  public static let BrownieStoreUpdated = Notification.Name("BrownieStoreUpdated")
}

public protocol BrownieStoreProtocol: Codable {
  static var storeName: String { get }
}

public struct StoreKey<State: Codable>: EnvironmentKey {
  public static var defaultValue: Store<State> { fatalError("Store not provided") }
}

public extension EnvironmentValues {
  func store<State>(_ type: State.Type) -> Store<State> {
    self[StoreKey<State>.self]
  }
}

@MainActor
@propertyWrapper
public struct UseStore<State: BrownieStoreProtocol>: DynamicProperty {
  @StateObject private var store: Store<State>

  public init() {
    let key = State.storeName
    let foundStore = StoreManager.shared.store(key: key, as: State.self)
    guard let foundStore else { fatalError("Store not found for key: \(key)") }
    self._store = StateObject(wrappedValue: foundStore)
  }

  public var wrappedValue: Store<State> {
    store
  }
}

@objc public class StoreManager: NSObject {
  @objc public static let shared = StoreManager()

  private var stores: [String: Any] = [:]
  private let lock = NSLock()

  public func register<State: Codable>(store: Store<State>, key: String) {
    lock.lock()
    defer { lock.unlock() }
    stores[key] = store
  }

  public func store<State>(key: String, as type: State.Type) -> Store<State>? {
    lock.lock()
    defer { lock.unlock() }
    return stores[key] as? Store<State>
  }

  public func removeStore(key: String) {
    lock.lock()
    defer { lock.unlock() }
    stores.removeValue(forKey: key)
    BrownieStoreBridge.removeStore(withKey: key)
  }

  @objc public func snapshot(key: String) -> [String: Any]? {
    return BrownieStoreBridge.getSnapshot(forStore: key) as? [String: Any]
  }

  @objc public func setValue(key: String, property: String, value: Any) {
    BrownieStoreBridge.setValue(value, forKey: property, inStore: key)
  }
}

public extension StoreManager {
  static func get<State>(key: String, as type: State.Type) -> Store<State>? {
    shared.store(key: key, as: type)
  }
}

public class Store<State: Codable>: ObservableObject {
  private let storeKey: String
  @Published public private(set) var state: State
  private var notificationObserver: NSObjectProtocol?

  public init(_ initialState: State, key: String) {
    self.storeKey = key
    self.state = initialState

    BrownieStoreBridge.registerStore(withKey: key)
    pushStateToCxx()

    notificationObserver = NotificationCenter.default.addObserver(
      forName: .BrownieStoreUpdated,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.handleStoreUpdate(notification)
    }

    StoreManager.shared.register(store: self, key: key)
  }

  deinit {
    if let observer = notificationObserver {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  private func pushStateToCxx() {
    guard let data = try? JSONEncoder().encode(state),
          let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }

    BrownieStoreBridge.setState(from: dict, forStore: storeKey)
  }

  private func handleStoreUpdate(_ notification: Notification) {
    guard let updatedKey = notification.userInfo?["storeKey"] as? String,
          updatedKey == storeKey else { return }
    rebuildState()
  }

  private func rebuildState() {
    guard let snapshot = BrownieStoreBridge.getSnapshot(forStore: storeKey),
          let data = try? JSONSerialization.data(withJSONObject: snapshot),
          let newState = try? JSONDecoder().decode(State.self, from: data) else { return }

    DispatchQueue.main.async { [weak self] in
      self?.state = newState
    }
  }

  /// Update state using a closure
  public func set(_ updater: (inout State) -> Void) {
    updater(&state)
    pushStateToCxx()
  }

  /// Set property using type-safe keypath
  public func set<Value>(_ keyPath: WritableKeyPath<State, Value>, to value: Value) {
    state[keyPath: keyPath] = value
    pushStateToCxx()
  }

  /// Get property using type-safe keypath
  public func get<Value>(_ keyPath: KeyPath<State, Value>) -> Value {
    state[keyPath: keyPath]
  }

  /// Convenience subscript for property access
  public subscript<Value>(_ keyPath: KeyPath<State, Value>) -> Value {
    state[keyPath: keyPath]
  }
}
