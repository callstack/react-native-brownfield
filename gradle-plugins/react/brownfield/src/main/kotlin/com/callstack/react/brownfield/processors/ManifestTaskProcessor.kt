package com.callstack.react.brownfield.processors

import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.MergingReport
import com.android.utils.ILogger
import com.callstack.react.brownfield.shared.GradleILogger
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.capitalized
import org.apache.tools.ant.BuildException
import org.gradle.api.Project
import org.gradle.api.logging.Logger
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter

object ManifestTaskProcessor {
    fun process(
        variantName: String,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val capitalizedVariant = variantName.capitalized()
        val taskNameCandidates =
            listOf(
                "process${capitalizedVariant}MainManifest",
                "process${capitalizedVariant}Manifest",
                "process${capitalizedVariant}ManifestForPackage",
            )
        val resolvedTaskName =
            taskNameCandidates.firstOrNull { taskName ->
                project.tasks.names.contains(taskName)
            }

        if (resolvedTaskName == null) {
            project.logger.warn(
                "Brownfield: no manifest processing task found for variant '$variantName'. " +
                    "Checked: ${taskNameCandidates.joinToString()}. Skipping manifest merge hook.",
            )
            return
        }

        project.tasks.named(resolvedTaskName).configure {
            it.doLast {
                val manifestOutput =
                    resolveManifestOutput(project, variantName, resolvedTaskName)
                        ?: run {
                            project.logger.warn(
                                "Brownfield: unable to locate merged manifest output for variant '$variantName' " +
                                    "after task '$resolvedTaskName'. Skipping manifest merge step.",
                            )
                            return@doLast
                        }

                val inputManifests = aarLibraries.map { library -> library.getManifestFile() }
                mergeManifests(manifestOutput, inputManifests, manifestOutput, project.logger)
            }
        }
    }

    private fun resolveManifestOutput(project: Project, variantName: String, taskName: String): File? {
        val buildDir = project.layout.buildDirectory.get().asFile
        val candidates =
            listOf(
                File(buildDir, "intermediates/merged_manifest/$variantName/$taskName/AndroidManifest.xml"),
                File(buildDir, "intermediates/merged_manifests/$variantName/AndroidManifest.xml"),
                File(buildDir, "intermediates/packaged_manifests/$variantName/AndroidManifest.xml"),
            )

        return candidates.firstOrNull { it.exists() }
    }

    private fun mergeManifests(
        mainManifestFile: File,
        secondaryManifestFiles: List<File>,
        outputFile: File,
        logger: Logger,
    ) {
        val iLogger: ILogger = GradleILogger(logger)
        val mergerInvoker = ManifestMerger2.newMerger(mainManifestFile, iLogger, ManifestMerger2.MergeType.LIBRARY)
        val manifestProviders = mutableListOf<ManifestProvider>()

        val filteredSecondaryManifests = secondaryManifestFiles.filter { it.exists() }
        filteredSecondaryManifests.forEach { file ->
            manifestProviders.add(
                object : ManifestProvider {
                    override fun getManifest(): File = file.absoluteFile

                    override fun getName(): String = file.name
                },
            )
        }

        mergerInvoker.addManifestProviders(manifestProviders)
        val mergingReport: MergingReport = mergerInvoker.merge()

        if (mergingReport.result.isError) {
            logger.error(mergingReport.reportString)
            mergingReport.log(iLogger)
            throw BuildException(mergingReport.reportString)
        }

        BufferedWriter(OutputStreamWriter(FileOutputStream(outputFile), "UTF-8")).use { writer ->
            writer.append(mergingReport.getMergedDocument(MergingReport.MergedManifestKind.MERGED))
            writer.flush()
        }
    }
}
