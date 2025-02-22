package com.callstack.rnbrownfield.shared

import com.callstack.rnbrownfield.shared.Constants.PLUGIN_NAME

object Logging : BaseProject() {
    fun error(
        message: Any,
        error: Throwable,
    ) {
        project.logger.error(getFormattedMessage(message), error)
    }

    fun info(message: Any) {
        project.logger.info(getFormattedMessage(message))
    }

    fun log(message: Any) {
        println(getFormattedMessage(message))
    }

    private fun getFormattedMessage(message: Any): String {
        return " $PLUGIN_NAME :: $message"
    }
}
