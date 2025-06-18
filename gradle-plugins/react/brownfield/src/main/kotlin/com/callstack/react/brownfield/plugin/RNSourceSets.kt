package com.callstack.react.brownfield.plugin

import com.android.build.gradle.LibraryExtension
import com.callstack.react.brownfield.exceptions.NameSpaceNotFound
import com.callstack.react.brownfield.utils.Extension
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.file.Directory
import org.gradle.api.tasks.Copy
import java.io.File

object RNSourceSets {
    private lateinit var project: Project
    private lateinit var extension: Extension
    private lateinit var androidExtension: LibraryExtension
    private lateinit var appProject: Project
    private lateinit var appBuildDir: Directory
    private lateinit var moduleBuildDir: Directory

    fun configure(
        project: Project,
        extension: Extension,
    ) {
        /**
         * Do not configure sourceSets for our example library.
         * The reason is that we expect some RN specific tasks to
         * be present on the consuming library, which is not the case
         * with our example library.
         */
        if (project.name == "example-android-library") {
            return
        }
        this.project = project
        this.extension = extension

        androidExtension = RNSourceSets.project.extensions.getByName("android") as LibraryExtension
        appProject = RNSourceSets.project.rootProject.project(RNSourceSets.extension.appProjectName)
        appBuildDir = appProject.layout.buildDirectory.get()
        moduleBuildDir = RNSourceSets.project.layout.buildDirectory.get()

        configureSourceSets()
        configureTasks()
    }

    private fun configureSourceSets() {
        androidExtension.sourceSets.getByName("main") {
            it.assets.srcDirs("$appBuildDir/generated/assets/createBundleReleaseJsAndAssets")
            it.res.srcDirs("$appBuildDir/generated/res/createBundleReleaseJsAndAssets")
            it.java.srcDirs("$moduleBuildDir/generated/autolinking/src/main/java")
        }

        androidExtension.sourceSets.getByName("release") {
            it.jniLibs.srcDirs("libsRelease")
        }

        androidExtension.sourceSets.getByName("debug") {
            it.jniLibs.srcDirs("libsDebug")
        }
    }

    private fun getLibraryNameSpace(): String {
        val nameSpace = androidExtension.namespace
        return nameSpace ?: throw NameSpaceNotFound("namespace must be defined in your android library build.gradle")
    }

    private fun patchRNEntryPoint(
        task: Task,
        path: String,
    ) {
        val rnEntryPointTaskName = "generateReactNativeEntryPoint"
        val rnEntryPointTask = appProject.tasks.named(rnEntryPointTaskName)

        /**
         * If `generateReactNativeEntryPoint` task does not exist, we early return. It means
         * the consumer library is running on RN version < 0.80
         */
        if (!rnEntryPointTask.isPresent) {
            return
        }

        task.dependsOn(rnEntryPointTask)
        val sourceFile = File(moduleBuildDir.toString(), "$path/com/facebook/react/ReactNativeApplicationEntryPoint.java")
        task.doLast {
            if (sourceFile.exists()) {
                var content = sourceFile.readText()
                val nameSpace = getLibraryNameSpace()

                /**
                 * We use look-ahead regex to replace any occurrences with Build.Config referenced via the old(app) package
                 *
                 * \b[\w.]+ → matches the old package
                 * (?=\.BuildConfig) → only if it’s immediately followed by that suffix
                 */
                val regex = Regex("""\b[\w.]+(?=\.BuildConfig)""")
                content = content.replace(regex, nameSpace)
                sourceFile.writeText(content)
            }
        }
    }

    private fun configureTasks() {
        val projectName = project.name
        val appProjectName = appProject.name

        project.tasks.register("copyAutolinkingSources", Copy::class.java) {
            val path = "generated/autolinking/src/main/java"
            it.dependsOn(":$appProjectName:generateAutolinkingPackageList")
            it.from("$appBuildDir/$path")
            it.into("$moduleBuildDir/$path")

            patchRNEntryPoint(it, path)
        }

        androidExtension.buildTypes.forEach { buildType ->
            val capitalisedBuildType = buildType.name.replaceFirstChar { it.titlecase() }
            val codegenTaskName = "generateCodegenSchemaFromJavaScript"
            val strippedNativeLibsPath = "$appBuildDir/intermediates/stripped_native_libs"
            val strippedDebugSymbolsPath = "strip${capitalisedBuildType}DebugSymbols/out/lib"

            val copyLibTask =
                project.tasks.register("copy${capitalisedBuildType}LibSources", Copy::class.java) {
                    it.dependsOn(":$appProjectName:$codegenTaskName")
                    it.dependsOn(":$appProjectName:strip${capitalisedBuildType}DebugSymbols")
                    it.dependsOn(":$projectName:$codegenTaskName")

                    it.from(
                        "$strippedNativeLibsPath/${buildType.name}/$strippedDebugSymbolsPath",
                    )
                    it.into(project.rootProject.file("$projectName/libs$capitalisedBuildType"))
                    it.include("**/libappmodules.so", "**/libreact_codegen_*.so")
                }

            project.tasks.named("preBuild").configure {
                it.dependsOn("copyAutolinkingSources")
                it.dependsOn(copyLibTask)
                if (capitalisedBuildType == "Release") {
                    it.dependsOn(":${appProject.name}:createBundleReleaseJsAndAssets")
                }
            }
        }
    }
}
