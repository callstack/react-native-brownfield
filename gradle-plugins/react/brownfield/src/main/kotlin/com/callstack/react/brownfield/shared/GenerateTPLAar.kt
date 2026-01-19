package com.callstack.react.brownfield.shared

import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.InputFile

abstract class GenerateTPLAar: DefaultTask() {

    @get:InputFile
    abstract val inputTaskList: RegularFileProperty
}