package com.callstack.brownie

import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/**
 * Typed Kotlin facade over a shared C++ Brownie store.
 *
 * It keeps local typed state in sync with native snapshots and notifies subscribers on changes.
 */
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

  /**
   * Latest typed state snapshot known on the Kotlin side.
   */
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

  /**
   * Updates state with [updater] and pushes it to C++.
   *
   * Listener notification is triggered via the native storeDidChange callback and [rebuildState]
   * to keep Kotlin updates consistent with cross-runtime updates.
   */
  fun set(updater: (State) -> State) {
    val newState =
      stateLock.withLock {
        _state = updater(_state)
        _state
      }

    pushStateToCxx(newState)
  }

  /**
   * Replaces state with a concrete value.
   */
  fun set(value: State) {
    set { value }
  }

  /**
   * Sets a single property in the underlying C++ store using JSON payload.
   */
  fun setValue(property: String, valueJson: String) {
    BrownieStoreBridge.setValue(valueJson, property, storeKey)
  }

  /**
   * Reads a single property from the underlying C++ store as JSON.
   */
  fun getValue(property: String): String? = BrownieStoreBridge.getValue(property, storeKey)

  /**
   * Subscribes to full state updates.
   *
   * The listener is called immediately with current state and then on every update.
   */
  fun subscribe(onChange: (State) -> Unit): () -> Unit {
    listeners.add(onChange)
    onChange(state)
    return { listeners.remove(onChange) }
  }

  /**
   * Releases local listeners and bridge callbacks; called by [StoreManager].
   */
  internal fun dispose() {
    if (!disposed.compareAndSet(false, true)) {
      return
    }

    BrownieStoreBridge.removeStoreDidChangeListener(bridgeListenerId)
    listeners.clear()
  }

  /**
   * Closes this store and removes it from [StoreManager].
   */
  override fun close() {
    StoreManager.shared.removeStore(storeKey)
  }

  /**
   * Serializes typed state and pushes it to the C++ store.
   */
  private fun pushStateToCxx(state: State = this.state) {
    BrownieStoreBridge.setState(serializer.encode(state), storeKey)
  }

  /**
   * Pulls latest snapshot from C++, decodes it, and updates local state.
   */
  private fun rebuildState() {
    val snapshot = BrownieStoreBridge.getSnapshot(storeKey) ?: return
    val rebuiltState = runCatching { serializer.decode(snapshot) }.getOrNull() ?: return

    stateLock.withLock {
      _state = rebuiltState
    }

    notifyListeners(rebuiltState)
  }

  /**
   * Notifies all active local subscribers with [state].
   */
  private fun notifyListeners(state: State) {
    listeners.forEach { listener ->
      listener(state)
    }
  }
}

/**
 * Subscribes to a selected slice of store state.
 *
 * The listener is invoked only when the selected value changes by `!=`.
 */
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
