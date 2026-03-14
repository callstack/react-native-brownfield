package com.callstack.react.brownfield.utils

sealed class StringMatcher {
    abstract fun matches(input: String): Boolean

    data class Literal(private val value: String) : StringMatcher() {
        override fun matches(input: String): Boolean = input == value
    }

    data class Pattern(private val regex: Regex) : StringMatcher() {
        override fun matches(input: String): Boolean = regex.matches(input)
    }

    companion object {
        fun literal(value: String): StringMatcher = Literal(value)

        fun regex(pattern: String): StringMatcher = Pattern(Regex(pattern))

        fun regex(regex: Regex): StringMatcher = Pattern(regex)
    }
}
