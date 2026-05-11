package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.android.build.gradle.internal.LoggerWrapper
import com.android.build.gradle.internal.coverage.JacocoReportTask.JacocoReportWorkerAction.Companion.logger
import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.MergingReport
import com.android.utils.ILogger
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.capitalized
import org.apache.tools.ant.BuildException
import org.gradle.api.Project
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter

object ManifestTaskProcessor {
    fun process(
        variant: LibraryVariant,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val processManifestTask = variant.outputs.first().processManifestProvider.get()
        val variantName = variant.name
        processManifestTask.doLast {
            val buildDir = project.layout.buildDirectory.get()
            val manifestOutput =
                project.file(
                    "$buildDir/intermediates/merged_manifest/$variantName/process${variantName.capitalized()}Manifest/AndroidManifest.xml",
                )

            val inputManifests = aarLibraries.map { it.getManifestFile() }
            mergeManifests(manifestOutput, inputManifests, manifestOutput)
        }
    }

    private fun mergeManifests(
        mainManifestFile: File,
        secondaryManifestFiles: List<File>,
        outputFile: File,
    ) {
        val iLogger: ILogger = LoggerWrapper(logger)
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
