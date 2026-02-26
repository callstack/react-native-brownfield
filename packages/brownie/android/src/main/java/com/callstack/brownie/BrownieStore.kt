package com.callstack.brownie

import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

interface BrownieStoreSerializer<State> {
  fun encode(state: State): String

  fun decode(snapshotJson: String): State
}

interface BrownieStoreDefinition<State> {
  val storeName: String
  val serializer: BrownieStoreSerializer<State>
}

fun <State> BrownieStoreDefinition<State>.register(initialState: State): Store<State> {
  return Store(initialState, storeName, serializer)
}

class StoreManager private constructor() {
  companion object {
    val shared: StoreManager = StoreManager()
  }

  private val lock = ReentrantLock()
  private val stores: MutableMap<String, Any> = mutableMapOf()

  fun <State> register(store: Store<State>, key: String) {
    lock.withLock {
      stores[key] = store
    }
  }

  fun removeStore(key: String) {
    val store = lock.withLock {
      stores.remove(key) as? Store<*>
    }

    store?.dispose()
    BrownieStoreBridge.removeStore(key)
  }

  fun clear() {
    val keys = lock.withLock {
      stores.keys.toList()
    }

    keys.forEach { key ->
      removeStore(key)
    }
  }
}

class Store<State>(
  initialState: State,
  private val storeKey: String,
  private val serializer: BrownieStoreSerializer<State>,
) : AutoCloseable {
  private val stateLock = ReentrantLock()
  private val listeners = CopyOnWriteArraySet<(State) -> Unit>()
  private val disposed = AtomicBoolean(false)

  @Volatile
  private var _state: State = initialState

  val state: State
    get() = stateLock.withLock { _state }

  private val bridgeListenerId: String

  init {
    BrownieStoreBridge.registerStore(storeKey)
    pushStateToCxx()

    bridgeListenerId =
      BrownieStoreBridge.addStoreDidChangeListener { updatedStoreKey ->
        if (updatedStoreKey == storeKey) {
          rebuildState()
        }
      }

    StoreManager.shared.register(this, storeKey)
  }

  fun set(updater: (State) -> State) {
    val newState =
      stateLock.withLock {
        _state = updater(_state)
        _state
      }

    pushStateToCxx(newState)
    notifyListeners(newState)
  }

  fun set(value: State) {
    set { value }
  }

  fun setValue(property: String, valueJson: String) {
    BrownieStoreBridge.setValue(valueJson, property, storeKey)
  }

  fun getValue(property: String): String? = BrownieStoreBridge.getValue(property, storeKey)

  fun subscribe(onChange: (State) -> Unit): () -> Unit {
    listeners.add(onChange)
    onChange(state)
    return { listeners.remove(onChange) }
  }

  internal fun dispose() {
    if (!disposed.compareAndSet(false, true)) {
      return
    }

    BrownieStoreBridge.removeStoreDidChangeListener(bridgeListenerId)
    listeners.clear()
  }

  override fun close() {
    StoreManager.shared.removeStore(storeKey)
  }

  private fun pushStateToCxx(state: State = this.state) {
    BrownieStoreBridge.setState(serializer.encode(state), storeKey)
  }

  private fun rebuildState() {
    val snapshot = BrownieStoreBridge.getSnapshot(storeKey) ?: return
    val rebuiltState = runCatching { serializer.decode(snapshot) }.getOrNull() ?: return

    stateLock.withLock {
      _state = rebuiltState
    }

    notifyListeners(rebuiltState)
  }

  private fun notifyListeners(state: State) {
    listeners.forEach { listener ->
      listener(state)
    }
  }
}
