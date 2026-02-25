package com.callstack.brownfield.android.example

import com.callstack.brownie.BrownieStoreDefinition
import com.callstack.brownie.BrownieStoreSerializer
import com.callstack.brownie.Store
import com.callstack.brownie.register
import com.rnapp.brownfieldlib.BrownfieldStore
import com.rnapp.brownfieldlib.User
import java.util.concurrent.atomic.AtomicBoolean
import org.json.JSONObject

private val didRegisterBrownieStore = AtomicBoolean(false)
private var brownieStore: Store<BrownfieldStore>? = null

private object BrownfieldStoreDefinitionAndroid : BrownieStoreDefinition<BrownfieldStore> {
    override val storeName: String = BrownfieldStore.STORE_NAME
    override val serializer: BrownieStoreSerializer<BrownfieldStore> = object : BrownieStoreSerializer<BrownfieldStore> {
        override fun encode(state: BrownfieldStore): String {
            return JSONObject()
                .put("counter", state.counter)
                .put("user", JSONObject().put("name", state.user.name))
                .toString()
        }

        override fun decode(snapshotJson: String): BrownfieldStore {
            val stateJson = JSONObject(snapshotJson)
            val userJson = stateJson.optJSONObject("user")

            return BrownfieldStore(
                counter = stateJson.optDouble("counter", 0.0),
                user = User(name = userJson?.optString("name").orEmpty())
            )
        }
    }
}

fun registerBrownieStoreIfNeeded() {
    if (!didRegisterBrownieStore.compareAndSet(false, true)) {
        return
    }

    brownieStore = BrownfieldStoreDefinitionAndroid.register(
        initialState = BrownfieldStore(
            counter = 0.0,
            user = User(name = "Username")
        )
    )
}

fun subscribeToBrownieCounter(onCounterChanged: (Int) -> Unit): () -> Unit {
    val store = brownieStore ?: return {}
    return store.subscribe { state ->
        onCounterChanged(state.counter.toInt())
    }
}

fun incrementBrownieCounter() {
    brownieStore?.set { state ->
        state.copy(counter = state.counter + 1)
    }
}
