import Foundation
import Combine
import SwiftUI

extension Notification.Name {
  /**
   * Notification sent when brownie store is update.d
   */
  public static let BrownieStoreUpdated = Notification.Name("BrownieStoreUpdated")
}


protocol StateStorable {
  func stateDictionary() -> [String: Any]?
}

protocol StateSettable {
  func setProperty(_ property: String, value: Any)
}

@objc public class StoreManager: NSObject {
  @objc public static let shared = StoreManager()
  
  private var stores: [String: Any] = [:]
  
  // Register a store with a key
  public func register<State>(store: Store<State>, key: String) {
    stores[key] = store
  }
  
  // Register a store with type-based key
  public func register<State>(store: Store<State>, for type: State.Type) {
    let key = String(describing: type)
    stores[key] = store
  }
  
  // Get store by key
  public func store<State>(key: String, as type: State.Type) -> Store<State>? {
    return stores[key] as? Store<State>
  }
  
  // Get store by type
  public func store<State>(for type: State.Type) -> Store<State>? {
    let key = String(describing: type)
    return stores[key] as? Store<State>
  }
  
  // Remove store
  public func removeStore(key: String) {
    stores.removeValue(forKey: key)
  }
  
  @objc public func snapshot(key: String) -> [String: Any]? {
    guard let store = stores[key] as? StateStorable else { return nil }
    
    let data = store.stateDictionary()
    return data
  }
  
  @objc public func setValue(key: String, property: String, value: Any) {
    guard let store = stores[key] as? StateSettable else { return }
    store.setProperty(property, value: value)
  }
}

// MARK: - Global Access Extensions
public extension StoreManager {
  // Quick access methods
  static func get<State>(_ type: State.Type) -> Store<State>? {
    shared.store(for: type)
  }
  
  static func get<State>(key: String, as type: State.Type) -> Store<State>? {
    shared.store(key: key, as: type)
  }
}


// MARK: - Environment Setup
public struct StoreKey<State: Codable>: EnvironmentKey {
  public static var defaultValue: Store<State> { fatalError("Store not provided") }
}

public extension EnvironmentValues {
  func store<State>(_ type: State.Type) -> Store<State> {
    self[StoreKey<State>.self]
  }
}

// MARK: - Custom Hook
@MainActor
@propertyWrapper
public struct UseStore<State: Codable, Value>: DynamicProperty {
  private let keyPath: KeyPath<State, Value>
  @StateObject private var store: Store<State>
  
  public init(_ keyPath: KeyPath<State, Value>) {
    self.keyPath = keyPath
    let foundStore = StoreManager.shared.store(for: State.self)
    guard let foundStore else { fatalError("Store not found for \(State.self)") }
    self._store = StateObject(wrappedValue: foundStore)
  }
  
  public var wrappedValue: Value {
    store.state[keyPath: keyPath]
  }
  
  public var projectedValue: Store<State> {
    store
  }
}

// MARK: - Simple Store
public class Store<State: Codable>: ObservableObject, StateStorable, StateSettable {
  @Published var state: State
  
  public init(_ initialState: State) {
    self.state = initialState
  }
  
  // Synchronous updates
  public func set(_ updater: (inout State) -> Void) {
    updater(&state)
    NotificationCenter.default.post(name: .BrownieStoreUpdated, object: nil)
  }
  
  // Direct property updates
  public func set<Value>(_ keyPath: WritableKeyPath<State, Value>, to value: Value) {
    state[keyPath: keyPath] = value
    NotificationCenter.default.post(name: .BrownieStoreUpdated, object: nil)
  }
  
  // Get current value
  public func get<Value>(_ keyPath: KeyPath<State, Value>) -> Value {
    state[keyPath: keyPath]
  }
  
  func stateDictionary() -> [String : Any]? {
    do {
      let data = try JSONEncoder().encode(state)
      let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      return dict
    } catch {
      return nil
    }
  }
  
  func setProperty(_ property: String, value: Any) {
    guard var dict = stateDictionary() else { return }
    dict[property] = value
    
    do {
      let data = try JSONSerialization.data(withJSONObject: dict)
      let newState = try JSONDecoder().decode(State.self, from: data)
      DispatchQueue.main.async {
        self.state = newState
        NotificationCenter.default.post(name: .BrownieStoreUpdated, object: nil)
      }
    } catch {
      print("Failed to set property: \(error)")
    }
  }
}
