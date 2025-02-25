package com.callstack.react.brownfield.shared

import org.gradle.api.internal.file.FileResolver
import org.gradle.api.internal.tasks.TaskDependencyFactory
import org.gradle.internal.model.CalculatedValueContainerFactory

open class GradleProps {
    lateinit var calculatedValueContainerFactory: CalculatedValueContainerFactory
    lateinit var taskDependencyFactory: TaskDependencyFactory
    lateinit var fileResolver: FileResolver
}
