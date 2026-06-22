package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.shared.Constants.INTERMEDIATES_TEMP_DIR
import com.callstack.react.brownfield.shared.ExplodeAarTask
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

/**
 * Below contains a list of dynamic libs which we should not embed
 * with the AAR as they are provided by the Gradle when AAR is
 * consumed by the host App.
 */
val UN_ALLOWED_LIBS = listOf(
    "libc++_shared.so", "libfbjni.so", "libhermestooling.so",
    "libhermesvm.so", "libimagepipeline.so", "libjsi.so",
    "libnative-filters.so", "libnative-imagetranscoder.so",
    "libreactnative.so"
)

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
                println("=== output path -- ${outDir.path}")
                println("=== JNI Dir -- ${jniDir.path}")
                processNestedLibs(jniDir.listFiles(), existingJNILibs)

                // If not using stripped files, copy the unstripped ones directly to our output
                if (!useStrippedSoFiles.get()) {
                    println("=== copying unstripped libs")
                    jniDir.copyRecursively(outDir, overwrite = true)
                }
            } else {
                println("=== JNI do not exists")
            }
        }

        // 2. If using stripped files, copy targeted files from the stripped directory
        if (useStrippedSoFiles.get() && strippedLibsDir.isPresent) {
            println("=== copying stripped libs")
            copyStrippedSoLibs(outDir, existingJNILibs)
        }
    }

    private fun copyStrippedSoLibs(outDir: File, existingJNILibs: MutableMap<String, MutableList<String>>) {
        val fromDir = strippedLibsDir.get().asFile
        if (fromDir.exists()) {
            existingJNILibs.forEach { (arch, libNames) ->
                val sourceArchDir = File(fromDir, arch)
                if (sourceArchDir.exists()) {
                    val destArchDir = File(outDir, arch).apply { mkdirs() }
                    sourceArchDir.listFiles()?.forEach { file ->
                        val name = file.name

                        val isCodegenLib = name.startsWith("libreact_codegen_") && name.endsWith(".so")
                        val isUnAllowedLib = UN_ALLOWED_LIBS.any { lib -> name == lib || name.contains(lib) }
                        val matchesFilter = name == "libappmodules.so" || isCodegenLib || !isUnAllowedLib

                        if (matchesFilter) {
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
        explodeTask: TaskProvider<ExplodeAarTask>,
    ) {
        val variantName = variant.name
        val capitalizedVariantName = variantName.capitalized()
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val processJniTask = project.tasks.register("processCustomJniLibsFor$capitalizedVariantName",ProcessAndCopyJniLibsTask::class.java) {
//            Verify if this is required
//            it.dependsOn(explodeTask)
            it.useStrippedSoFiles.set(projectExt.useStrippedSoFiles)

            val jniDirs = aarLibraries.map { aarLib ->
                aarLib.getJniDir()
            }

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
