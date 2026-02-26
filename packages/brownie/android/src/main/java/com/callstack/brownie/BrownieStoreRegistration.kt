package com.callstack.brownie

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Registers a new [Store] instance from this definition and the provided initial state.
 */
fun <State> BrownieStoreDefinition<State>.register(initialState: State): Store<State> {
  return Store(initialState, storeName, serializer)
}

/**
 * Convenience API that creates a definition with Gson and registers it.
 */
fun <State : Any> registerStore(
  storeName: String,
  initialState: State,
  clazz: Class<State>,
): Store<State> = brownieStoreDefinition(storeName, clazz).register(initialState)

/**
 * Reified overload of [registerStore].
 */
inline fun <reified State : Any> registerStore(
  storeName: String,
  initialState: State,
): Store<State> = registerStore(storeName, initialState, State::class.java)

private object BrownieStoreRegistrationTracker {
  private val didRegisterByKey = ConcurrentHashMap<String, AtomicBoolean>()

  /**
   * Returns true only for the first registration attempt of a given store key.
   */
  fun markRegistered(key: String): Boolean {
    val registrationFlag = didRegisterByKey.getOrPut(key) { AtomicBoolean(false) }
    return registrationFlag.compareAndSet(false, true)
  }
}

/**
 * Registers once per store name and returns null when the store was already registered.
 */
fun <State> BrownieStoreDefinition<State>.registerIfNeeded(initialState: () -> State): Store<State>? {
  if (!BrownieStoreRegistrationTracker.markRegistered(storeName)) {
    return null
  }
  return register(initialState())
}

/**
 * Convenience API that registers only once for the provided key.
 */
fun <State : Any> registerStoreIfNeeded(
  storeName: String,
  initialState: () -> State,
  clazz: Class<State>,
): Store<State>? = brownieStoreDefinition(storeName, clazz).registerIfNeeded(initialState)

/**
 * Reified overload of [registerStoreIfNeeded].
 */
inline fun <reified State : Any> registerStoreIfNeeded(
  storeName: String,
  noinline initialState: () -> State,
): Store<State>? = registerStoreIfNeeded(storeName, initialState, State::class.java)
