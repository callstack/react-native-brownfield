package com.callstack.brownie

import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/**
 * Process-wide registry of Kotlin [Store] instances keyed by store name.
 */
class StoreManager private constructor() {
  companion object {
    /**
     * Shared singleton used by Brownie runtime and app integrations.
     */
    val shared: StoreManager = StoreManager()
  }

  private val lock = ReentrantLock()
  private val stores: MutableMap<String, Any> = mutableMapOf()

  /**
   * Registers a store instance under a key.
   */
  fun <State> register(store: Store<State>, key: String) {
    lock.withLock {
      stores[key] = store
    }
  }

  /**
   * Retrieves a typed store by key when the runtime state type matches [clazz].
   */
  fun <State> store(key: String, clazz: Class<State>): Store<State>? {
    return lock.withLock {
      val store = stores[key] as? Store<*> ?: return@withLock null
      runCatching { clazz.cast(store.state) }.getOrNull() ?: return@withLock null
      @Suppress("UNCHECKED_CAST")
      store as Store<State>
    }
  }

  /**
   * Removes a store from the registry and from the native bridge.
   */
  fun removeStore(key: String) {
    val store = lock.withLock {
      stores.remove(key) as? Store<*>
    }

    store?.dispose()
    BrownieStoreBridge.removeStore(key)
  }

  /**
   * Removes all registered stores.
   */
  fun clear() {
    val keys = lock.withLock {
      stores.keys.toList()
    }

    keys.forEach { key ->
      removeStore(key)
    }
  }
}

/**
 * Reified convenience overload for [StoreManager.store].
 */
inline fun <reified State : Any> StoreManager.store(key: String): Store<State>? {
  return store(key, State::class.java)
}
