@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.artifacts

import org.gradle.api.component.Artifact
import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.shared.BaseProject
import org.gradle.api.Task
import org.gradle.api.artifacts.Configuration
import org.gradle.api.artifacts.result.ResolvedArtifactResult
import org.gradle.api.internal.artifacts.dsl.LazyPublishArtifact
import org.gradle.api.internal.artifacts.result.DefaultResolvedArtifactResult
import org.gradle.api.internal.file.FileResolver
import org.gradle.api.internal.tasks.TaskDependencyFactory
import org.gradle.api.tasks.TaskProvider
import org.gradle.api.tasks.bundling.Zip
import org.gradle.internal.Describables
import org.gradle.internal.component.external.model.ImmutableCapabilities
import org.gradle.internal.component.local.model.PublishArtifactLocalArtifactMetadata
import org.gradle.internal.component.model.DefaultIvyArtifactName
import java.io.File

class FlavorArtifact(private val variant: LibraryVariant,
    private val configuration: Configuration) : BaseProject() {
    fun createFlavorArtifact(
        fileResolver: FileResolver,
        taskDependencyFactory: TaskDependencyFactory,
        bundleTaskProvider: TaskProvider<Task>?,
    ): ResolvedArtifactResult {
        val artifactFile = createArtifactFile(bundleTaskProvider?.get() as Task)
        val artifactName = DefaultIvyArtifactName(artifactFile.name, "aar", "")

        return DefaultResolvedArtifactResult(
            PublishArtifactLocalArtifactMetadata(
                { artifactName.name },
                LazyPublishArtifact(bundleTaskProvider, fileResolver, taskDependencyFactory),
            ),
            configuration.attributes,
            ImmutableCapabilities.EMPTY,
            Describables.of(variant.name),
            Artifact::class.java,
            artifactFile
        )
    }

    private fun createArtifactFile(bundle: Task): File {
        val packageLibraryProvider = bundle as Zip
        return File(packageLibraryProvider.destinationDirectory.get().asFile, packageLibraryProvider.archiveFileName.get())
    }
}
