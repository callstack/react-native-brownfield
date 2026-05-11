package com.callstack.react.brownfield.shared

import com.android.utils.ILogger
import org.gradle.api.logging.Logger
import java.util.IllegalFormatException

class GradleILogger(
    private val logger: Logger,
) : ILogger {
    override fun error(
        throwable: Throwable?,
        msgFormat: String?,
        vararg args: Any?,
    ) {
        val message = formatMessage(msgFormat, args)
        logger.error(message, throwable)
    }

    override fun warning(
        msgFormat: String?,
        vararg args: Any?,
    ) {
        logger.warn(formatMessage(msgFormat, args))
    }

    override fun info(
        msgFormat: String?,
        vararg args: Any?,
    ) {
        logger.info(formatMessage(msgFormat, args))
    }

    override fun verbose(
        msgFormat: String?,
        vararg args: Any?,
    ) {
        logger.debug(formatMessage(msgFormat, args))
    }

    @Suppress("SpreadOperator") // Required for Java vararg interop with String.format.
    private fun formatMessage(
        msgFormat: String?,
        args: Array<out Any?>,
    ): String {
        if (msgFormat == null) {
            return ""
        }

        return try {
            if (args.isEmpty()) {
                msgFormat
            } else {
                String.format(msgFormat, *args)
            }
        } catch (_: IllegalFormatException) {
            msgFormat
        }
    }
}
