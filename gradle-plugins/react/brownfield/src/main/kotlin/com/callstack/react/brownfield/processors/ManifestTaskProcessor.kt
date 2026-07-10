package com.callstack.react.brownfield.processors

import com.android.build.api.artifact.SingleArtifact
import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.shared.MergeLibraryManifestTask
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Project

object ManifestTaskProcessor {
    fun process(
        variant: LibraryVariant,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
        val taskProvider =
            project.tasks.register(
                "transform${capitalizedVariantName}BrownfieldMergedManifest",
                MergeLibraryManifestTask::class.java,
            ) { task ->
                task.variantName.set(variant.name)
                task.namespace.set(variant.namespace)
                task.manifestPlaceholders.set(variant.manifestPlaceholders)
                task.aarManifestFiles.from(aarLibraries.map { it.getManifestFile() })

                // The exploded AAR manifests are generated out of band, so keep the transform
                // ordered after the variant-specific explode task without reaching for old APIs.
                task.dependsOn("explode${capitalizedVariantName}Aar")
            }

        variant.artifacts
            .use(taskProvider)
            .wiredWithFiles(
                MergeLibraryManifestTask::inputManifest,
                MergeLibraryManifestTask::outputManifest,
            ).toTransform(SingleArtifact.MERGED_MANIFEST)
    }
}
