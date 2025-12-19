import Foundation
import Combine
import SwiftUI

extension Notification.Name {
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
  
  public func register<State>(store: Store<State>, key: String) {
    stores[key] = store
  }
  
  public func store<State>(key: String, as type: State.Type) -> Store<State>? {
    return stores[key] as? Store<State>
  }
  
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

public extension StoreManager {
  static func get<State>(key: String, as type: State.Type) -> Store<State>? {
    shared.store(key: key, as: type)
  }
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
public struct UseStore<State: Codable, Value>: DynamicProperty {
  private let keyPath: KeyPath<State, Value>
  @StateObject private var store: Store<State>
  
  public init(_ keyPath: KeyPath<State, Value>, key: String) {
    self.keyPath = keyPath
    let foundStore = StoreManager.shared.store(key: key, as: State.self)
    guard let foundStore else { fatalError("Store not found for key: \(key)") }
    self._store = StateObject(wrappedValue: foundStore)
  }
  
  public var wrappedValue: Value {
    store.state[keyPath: keyPath]
  }
  
  public var projectedValue: Store<State> {
    store
  }
}

public class Store<State: Codable>: ObservableObject, StateStorable, StateSettable {
  @Published var state: State
  
  public init(_ initialState: State) {
    self.state = initialState
  }
  
  public func set(_ updater: (inout State) -> Void) {
    updater(&state)
    NotificationCenter.default.post(name: .BrownieStoreUpdated, object: nil)
  }
  
  public func set<Value>(_ keyPath: WritableKeyPath<State, Value>, to value: Value) {
    state[keyPath: keyPath] = value
    NotificationCenter.default.post(name: .BrownieStoreUpdated, object: nil)
  }
  
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
