package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.plugin.VariantContext
import com.callstack.react.brownfield.shared.BundleTaskProvider
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.tasks.TaskProvider
import org.gradle.api.tasks.bundling.Zip
import java.io.File

object ExplodeTaskProvider {
    fun getTask(
        variant: VariantContext,
        project: Project,
        artifacts: List<UnresolvedArtifactInfo>,
    ): TaskProvider<ExplodeAarTask> {
        val variantTaskProvider = VariantTaskProvider(project)
        val bundleProvider = BundleTaskProvider(variantTaskProvider)
        val capitalizedVariantName = variant.name.capitalized()

        return project.tasks.register(
            "explode${capitalizedVariantName}Aar",
            ExplodeAarTask::class.java,
        ) { task ->
            task.variantName.set(variant.name)
            task.minifyEnabled.set(variant.isMinifyEnabled)

            val finalArtifacts = mutableListOf<UnresolvedArtifactInfo>()
            artifacts.forEach { art ->
                var artifactPath = art.file
                if (art.isExpoPublishDependency != true) {
                    val dependencyProject = project.project(":${art.moduleName}")
                    val bundleTaskProvider =
                        bundleProvider.getBundleTask(
                            project = dependencyProject,
                            variantName = variant.name,
                            buildType = variant.buildType,
                            productFlavors = variant.productFlavors,
                        )

                    if (bundleTaskProvider != null) {
                        task.dependsOn(bundleTaskProvider)
                        artifactPath = createArtifactFile(bundleTaskProvider.get() as Task).absolutePath
                    }
                }

                finalArtifacts.add(
                    UnresolvedArtifactInfo(
                        art.moduleGroup,
                        art.moduleName,
                        art.moduleVersion,
                        artifactPath,
                        isExpoPublishDependency = art.isExpoPublishDependency,
                    ),
                )
            }

            task.inputArtifacts.set(finalArtifacts)
        }
    }

    private fun createArtifactFile(bundle: Task): File {
        val packageLibraryProvider = bundle as Zip
        return File(packageLibraryProvider.destinationDirectory.get().asFile, packageLibraryProvider.archiveFileName.get())
    }
}
