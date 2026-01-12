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

public extension Binding {
  /// Set value using closure that receives current value
  func set(_ updater: (Value) -> Value) {
    wrappedValue = updater(wrappedValue)
  }
}

@MainActor
@propertyWrapper
public struct UseStore<State: BrownieStoreProtocol, Value: Equatable>: DynamicProperty {
  @StateObject private var observer: SelectorObserver<State, Value>
  private let keyPath: WritableKeyPath<State, Value>

  public init(_ keyPath: WritableKeyPath<State, Value>) {
    self.keyPath = keyPath
    let key = State.storeName
    guard let foundStore = StoreManager.shared.store(key: key, as: State.self) else {
      fatalError("Store not found for key: \(key)")
    }
    self._observer = StateObject(wrappedValue: SelectorObserver(store: foundStore, keyPath: keyPath))
  }

  public var wrappedValue: Value {
    observer.value
  }

  public var projectedValue: Binding<Value> {
    Binding(
      get: { observer.store.get(keyPath) },
      set: { observer.store.set(keyPath, to: $0) }
    )
  }
}

/// Internal observer that only publishes when selected value changes.
@MainActor
class SelectorObserver<State: Codable, Value: Equatable>: ObservableObject {
  let store: Store<State>
  private let keyPath: KeyPath<State, Value>
  @Published private(set) var value: Value
  private var cancellable: AnyCancellable?

  init(store: Store<State>, keyPath: KeyPath<State, Value>) {
    self.store = store
    self.keyPath = keyPath
    self.value = store.state[keyPath: keyPath]

    self.cancellable = store.$state
      .map { $0[keyPath: keyPath] }
      .removeDuplicates()
      .sink { [weak self] newValue in
        self?.value = newValue
      }
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

    state = newState
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

  // MARK: - UIKit Support

  /// Subscribe to state changes with a closure. Returns a cancellation function.
  public func subscribe(onChange: @escaping (State) -> Void) -> () -> Void {
    let cancellable = $state.sink { state in
      onChange(state)
    }
    return { cancellable.cancel() }
  }

  /// Subscribe to specific property changes. Returns a cancellation function.
  public func subscribe<Value: Equatable>(
    _ keyPath: KeyPath<State, Value>,
    onChange: @escaping (Value) -> Void
  ) -> () -> Void {
    let cancellable = $state
      .map { $0[keyPath: keyPath] }
      .removeDuplicates()
      .sink { value in
        onChange(value)
      }
    return { cancellable.cancel() }
  }
}
