package com.callstack.kotlinexample

data class BrownfieldStore (
    val counter: Double,
    val hasError: Boolean,
    val isLoading: Boolean,
    val user: User
) {
    companion object {
        const val STORE_NAME = "BrownfieldStore"
    }
}

data class User (
    val name: String
)
