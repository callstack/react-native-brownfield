package com.callstack.react.brownfield.plugin

import com.android.build.api.dsl.LibraryExtension
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.callstack.react.brownfield.exceptions.NameSpaceNotFound
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.tasks.Copy
import java.io.File

object RNSourceSets {
    private lateinit var project: Project
    private lateinit var extension: Extension
    private lateinit var androidExtension: LibraryExtension

    fun configure(
        project: Project,
        extension: Extension,
    ) {
        this.project = project
        this.extension = extension

        androidExtension = this.project.extensions.getByType(LibraryExtension::class.java)

        configureSourceSets()
        configureTasks()
    }

    private fun getAppProject(): Project = project.rootProject.project(extension.appProjectName)

    private fun getAppBuildDir() = getAppProject().layout.buildDirectory.get()

    private fun getModuleBuildDir() = project.layout.buildDirectory.get()

    private fun configureSourceSets() {
        // 1. Get the 'androidComponents' extension for the new Variant API
        val componentsExtension = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)

        // Move the non-variant-specific configuration out of the loop
        androidExtension.sourceSets.named("main") { sourceSet ->
            // This path is not variant-specific, so it's added once here.
            sourceSet.java.directories.add("${getModuleBuildDir()}/generated/autolinking/src/main/java")
        }

        // 2. Use the onVariants block to wire RN bundle outputs via the Variant Sources API
        componentsExtension.onVariants { variant ->
            val variantName = variant.name
            val bundledAssetsVariantName =
                Utils.getBundledAssetsVariantName(
                    variantName = variantName,
                    buildTypeName = variant.buildType,
                    isDebuggable = variant.debuggable,
                )
            val capitalizedBundledAssetsVariantName = bundledAssetsVariantName.capitalized()
            val appProject = getAppProject()

            val bundlePathSegments =
                listOf(
                    // outputs for RN <= 0.81
                    "createBundle${capitalizedBundledAssetsVariantName}JsAndAssets",
                    // outputs for RN >= 0.82
                    "react/$bundledAssetsVariantName",
                )

            val appBuildDir = getAppBuildDir()
            bundlePathSegments.forEach { segment ->
                variant.sources.assets?.addStaticSourceDirectory("$appBuildDir/generated/assets/$segment")
                variant.sources.res?.addStaticSourceDirectory("$appBuildDir/generated/res/$segment")
            }

            if (Utils.hasExpoUpdates(appProject, variantName)) {
                val updateResourcesPathSegment = Utils.getExpoUpdatesResourcesTaskName(variantName)
                variant.sources.assets?.addStaticSourceDirectory("$appBuildDir/generated/assets/$updateResourcesPathSegment")
                variant.sources.res?.addStaticSourceDirectory("$appBuildDir/generated/res/$updateResourcesPathSegment")
            }
        }
    }

    private fun getLibraryNameSpace(): String {
        val nameSpace = androidExtension.namespace
        return nameSpace
            ?: throw NameSpaceNotFound("namespace must be defined in your android library build.gradle")
    }

    private fun patchRNEntryPoint(
        task: Task,
        path: String,
    ) {
        val rnEntryPointTaskName = "generateReactNativeEntryPoint"

        /**
         * If `generateReactNativeEntryPoint` task does not exist, we early return. It means
         * the consumer library is running on RN version < 0.80
         */
        val rnEntryPointTask = getAppProject().tasks.findByName(rnEntryPointTaskName) ?: return

        task.dependsOn(rnEntryPointTask)
        val sourceFile =
            File(
                getModuleBuildDir().toString(),
                "$path/com/facebook/react/ReactNativeApplicationEntryPoint.java",
            )
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
        project.tasks.register("copyAutolinkingSources", Copy::class.java) {
            val path = "generated/autolinking/src/main/java"
            val appBuildDir = getAppBuildDir()
            it.dependsOn(":${getAppProject().name}:generateAutolinkingPackageList")
            it.from("$appBuildDir/$path")
            it.into("${getModuleBuildDir()}/$path")

            patchRNEntryPoint(it, path)
        }

        project.tasks.named("preBuild").configure {
            /**
             * Ensure auto-generated sources are available before compilation.
             *
             * This hooks into the global `preBuild` task, so the dependency runs
             * regardless of build variant. Use this only when the generated sources
             * are identical for all variants (debug/release).
             *
             * If variant-specific
             * files are needed, prefer `preDebugBuild` / `preReleaseBuild` under
             * `VariantProcessor.processVariant`
             */
            it.dependsOn("copyAutolinkingSources")
        }
    }
}
