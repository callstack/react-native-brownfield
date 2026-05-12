package com.callstack.react.brownfield.plugin

data class VariantContext(
    val name: String,
    val buildType: String,
    val productFlavors: List<Pair<String, String>>,
    val isMinifyEnabled: Boolean,
)
