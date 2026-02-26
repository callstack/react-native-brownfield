package com.callstack.brownie

import com.google.gson.Gson
import java.util.concurrent.ConcurrentHashMap
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

private val brownieJson = Gson()

private class BrownieStoreDefinitionImpl<State>(
  override val storeName: String,
  override val serializer: BrownieStoreSerializer<State>,
) : BrownieStoreDefinition<State>

private class JsonBrownieStoreSerializer<State>(
  private val clazz: Class<State>,
) : BrownieStoreSerializer<State> {
  override fun encode(state: State): String = brownieJson.toJson(state)

  override fun decode(snapshotJson: String): State = brownieJson.fromJson(snapshotJson, clazz)
}

fun <State : Any> brownieStoreDefinition(
  storeName: String,
  clazz: Class<State>,
): BrownieStoreDefinition<State> = brownieStoreDefinition(storeName, JsonBrownieStoreSerializer(clazz))

inline fun <reified State : Any> brownieStoreDefinition(
  storeName: String,
): BrownieStoreDefinition<State> = brownieStoreDefinition(storeName, State::class.java)

fun <State> brownieStoreDefinition(
  storeName: String,
  serializer: BrownieStoreSerializer<State>,
): BrownieStoreDefinition<State> = BrownieStoreDefinitionImpl(storeName, serializer)

fun <State> brownieStoreDefinition(
  storeName: String,
  encode: (State) -> String,
  decode: (String) -> State,
): BrownieStoreDefinition<State> {
  return brownieStoreDefinition(
    storeName = storeName,
    serializer =
      object : BrownieStoreSerializer<State> {
        override fun encode(state: State): String = encode(state)

        override fun decode(snapshotJson: String): State = decode(snapshotJson)
      },
  )
}

fun <State> BrownieStoreDefinition<State>.register(initialState: State): Store<State> {
  return Store(initialState, storeName, serializer)
}

fun <State : Any> registerStore(
  storeName: String,
  initialState: State,
  clazz: Class<State>,
): Store<State> = brownieStoreDefinition(storeName, clazz).register(initialState)

inline fun <reified State : Any> registerStore(
  storeName: String,
  initialState: State,
): Store<State> = registerStore(storeName, initialState, State::class.java)

private object BrownieStoreRegistrationTracker {
  private val didRegisterByKey = ConcurrentHashMap<String, AtomicBoolean>()

  fun markRegistered(key: String): Boolean {
    val registrationFlag = didRegisterByKey.getOrPut(key) { AtomicBoolean(false) }
    return registrationFlag.compareAndSet(false, true)
  }
}

fun <State> BrownieStoreDefinition<State>.registerIfNeeded(initialState: () -> State): Store<State>? {
  if (!BrownieStoreRegistrationTracker.markRegistered(storeName)) {
    return null
  }
  return register(initialState())
}

fun <State : Any> registerStoreIfNeeded(
  storeName: String,
  initialState: () -> State,
  clazz: Class<State>,
): Store<State>? = brownieStoreDefinition(storeName, clazz).registerIfNeeded(initialState)

inline fun <reified State : Any> registerStoreIfNeeded(
  storeName: String,
  noinline initialState: () -> State,
): Store<State>? = registerStoreIfNeeded(storeName, initialState, State::class.java)

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

  fun <State> store(key: String, clazz: Class<State>): Store<State>? {
    return lock.withLock {
      val store = stores[key] as? Store<*> ?: return@withLock null
      runCatching { clazz.cast(store.state) }.getOrNull() ?: return@withLock null
      @Suppress("UNCHECKED_CAST")
      store as Store<State>
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

inline fun <reified State : Any> StoreManager.store(key: String): Store<State>? {
  return store(key, State::class.java)
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

fun <State, Selected> Store<State>.subscribe(
  selector: (State) -> Selected,
  onChange: (Selected) -> Unit,
): () -> Unit {
  val selectorLock = ReentrantLock()
  var hasSelection = false
  var previousSelection: Selected? = null

  return subscribe { state ->
    val newSelection = selector(state)
    val shouldNotify =
      selectorLock.withLock {
        if (!hasSelection || previousSelection != newSelection) {
          hasSelection = true
          previousSelection = newSelection
          true
        } else {
          false
        }
      }

    if (shouldNotify) {
      onChange(newSelection)
    }
  }
}
