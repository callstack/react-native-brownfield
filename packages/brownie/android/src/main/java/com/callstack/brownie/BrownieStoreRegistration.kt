package com.callstack.brownie

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

/**
 * Registers once per store name and returns null when the store was already registered.
 *
 * Idempotency is based on whether a store with this [storeName] currently exists
 * in [StoreManager], so clearing or removing a store allows registration again
 * within the same process.
 */
fun <State> BrownieStoreDefinition<State>.registerIfNeeded(initialState: () -> State): Store<State>? {
  return StoreManager.shared.registerIfAbsent(storeName) {
    register(initialState())
  }
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
