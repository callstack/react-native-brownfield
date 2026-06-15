package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import java.io.File

import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*
import kotlin.collections.component1
import kotlin.collections.component2

abstract class ProcessAndCopyJniLibsTask : DefaultTask() {

    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val aarJniDirs: ConfigurableFileCollection

    @get:InputDirectory
    @get:Optional
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val strippedLibsDir: DirectoryProperty

    @get:Input
    abstract val useStrippedSoFiles: Property<Boolean>

    @get:Input
    abstract val dynamicLibs: ListProperty<String>

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    @TaskAction
    fun execute() {
        val outDir = outputDirectory.get().asFile
        // Clear out old data to ensure clean, reproducible builds
        outDir.deleteRecursively()
        outDir.mkdirs()

        val existingJNILibs = listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
            .associateWith { mutableListOf<String>() }
            .toMutableMap()

        // 1. Scan and process duplicate libs from AAR paths
        aarJniDirs.forEach { jniDir ->
            if (jniDir.exists()) {
                processNestedLibs(jniDir.listFiles(), existingJNILibs)

                // If not using stripped files, copy the unstripped ones directly to our output
                if (!useStrippedSoFiles.get()) {
                    jniDir.copyRecursively(outDir, overwrite = true)
                }
            }
        }

        // 2. If using stripped files, copy targeted files from the stripped directory
        if (useStrippedSoFiles.get() && strippedLibsDir.isPresent) {
            copyStrippedSoLibs(outDir, existingJNILibs)
        }
    }

    private fun copyStrippedSoLibs(outDir: File, existingJNILibs: MutableMap<String, MutableList<String>>) {
        val fromDir = strippedLibsDir.get().asFile
        if (fromDir.exists()) {
            val allowedExtraLibs = dynamicLibs.get()

            existingJNILibs.forEach { (arch, libNames) ->
                val sourceArchDir = File(fromDir, arch)
                if (sourceArchDir.exists()) {
                    val destArchDir = File(outDir, arch).apply { mkdirs() }

                    sourceArchDir.listFiles()?.forEach { file ->
                        val name = file.name


                        val isCodegenLib = name.startsWith("libreact_codegen_") && name.endsWith(".so")
                        val isAllowedLib = allowedExtraLibs.any { lib -> name == lib || name.contains(lib) }
                        // Check against the filter patterns
                        val matchesFilter = name == "libappmodules.so" || isCodegenLib || isAllowedLib

                        if (name in libNames && matchesFilter) {
                            try {
                                file.copyTo(File(destArchDir, name), overwrite = true)
                            } catch (e: java.io.IOException) {
                                Logging.error("Failed to copy $name: ${e.message}", e.cause)
                            }
                        }
                    }
                }
            }
        }
    }

    private fun processNestedLibs(
        files: Array<File>?,
        existingJNILibs: MutableMap<String, MutableList<String>>,
    ) {
        files?.forEach { folder ->
            val libFiles = folder.listFiles() ?: return@forEach
            val libList = existingJNILibs[folder.name] ?: return@forEach

            libFiles.forEach { file ->
                if (file.name in libList) {
                    file.delete()
                } else {
                    libList.add(file.name)
                }
            }
        }
    }
}

class JNILibsProcessor(val project: Project) {
    fun processJniLibs(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        variant: LibraryVariant,
    ) {
        val variantName = variant.name
        val capitalizedVariantName = variantName.capitalized()
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val processJniTask = project.tasks.register("processCustomJniLibsFor$capitalizedVariantName",ProcessAndCopyJniLibsTask::class.java) {
            it.useStrippedSoFiles.set(projectExt.useStrippedSoFiles)
            it.dynamicLibs.set(projectExt.dynamicLibs)

            val jniDirs = aarLibraries.map { aarLib -> aarLib.getJniDir() }
            it.aarJniDirs.setFrom(jniDirs)

            val fromDirProvider = appProject.layout.buildDirectory.dir(
                "intermediates/stripped_native_libs/$variantName/strip${capitalizedVariantName}DebugSymbols/out/lib"
            )
            it.strippedLibsDir.set(fromDirProvider)

            val stripTaskPath = ":${appProject.name}:strip${capitalizedVariantName}DebugSymbols"
            val codegenTaskPath = ":${project.name}:generateCodegenSchemaFromJavaScript"
            it.dependsOn(stripTaskPath, codegenTaskPath)
        }

        variant.sources.jniLibs?.addGeneratedSourceDirectory(
            taskProvider = processJniTask,
            wiredWith = { it.outputDirectory }
        )
    }
}
