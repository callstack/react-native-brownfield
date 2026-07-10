package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.DefaultTask
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.TaskAction

@CacheableTask
abstract class ExplodeAarTask : DefaultTask() {
    @get:Internal
    abstract val inputArtifacts: ListProperty<UnresolvedArtifactInfo>

    @get:Input
    abstract val variantName: Property<String>

    @TaskAction
    fun run() {
        val artifacts = inputArtifacts.get()
        val resolvedVariantName = variantName.get()

        val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
        artifacts.forEach { art ->
            val artifactFile =
                requireNotNull(art.file) {
                    "Missing AAR file for artifact ${art.moduleGroup}:${art.moduleName}:${art.moduleVersion} " +
                        "while exploding variant $resolvedVariantName. Ensure the artifact is resolved " +
                        "or the dependency is configured to produce an AAR before running this task."
                }

            val archiveLibrary =
                AndroidArchiveLibrary(
                    this.project,
                    art,
                    resolvedVariantName,
                )

            aarLibraries.add(archiveLibrary)

            // explode-aar
            val zipFolder = archiveLibrary.getExplodedAarRootDir()
            zipFolder.mkdirs()

            project.copy {
                zipFolder.deleteRecursively()
                it.from(project.zipTree(artifactFile))
                it.into(zipFolder)
            }
        }
    }
}
