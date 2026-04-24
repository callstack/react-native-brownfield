package com.callstack.react.brownfield.utils

fun String.capitalized(): String {
    return this.replaceFirstChar(Char::titlecase)
}
