package com.callstack.brownie

import com.google.gson.Gson

/**
 * Serializer used by [Store] to sync typed Kotlin state with the C++ store as JSON.
 */
interface BrownieStoreSerializer<State> {
  /**
   * Encodes a typed state object into a JSON string.
   */
  fun encode(state: State): String

  /**
   * Decodes a JSON snapshot from native into a typed state object.
   */
  fun decode(snapshotJson: String): State
}

/**
 * Immutable description of a store key and its serialization strategy.
 */
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

/**
 * Creates a store definition backed by Gson using a runtime [Class].
 */
fun <State : Any> brownieStoreDefinition(
  storeName: String,
  clazz: Class<State>,
): BrownieStoreDefinition<State> = brownieStoreDefinition(storeName, JsonBrownieStoreSerializer(clazz))

/**
 * Creates a store definition backed by Gson using a reified state type.
 */
inline fun <reified State : Any> brownieStoreDefinition(
  storeName: String,
): BrownieStoreDefinition<State> = brownieStoreDefinition(storeName, State::class.java)

/**
 * Creates a store definition with a custom serializer implementation.
 */
fun <State> brownieStoreDefinition(
  storeName: String,
  serializer: BrownieStoreSerializer<State>,
): BrownieStoreDefinition<State> = BrownieStoreDefinitionImpl(storeName, serializer)

/**
 * Creates a store definition from encode/decode lambdas.
 */
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
