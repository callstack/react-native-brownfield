package com.callstack.rnbrownfield.plugin

import com.android.build.gradle.internal.LoggerWrapper
import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.MergingReport
import com.android.utils.ILogger
import com.callstack.rnbrownfield.shared.Logging
import org.apache.tools.ant.BuildException
import org.gradle.api.DefaultTask
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter

open class ManifestMerger : DefaultTask() {
    private var mGradlePluginVersion: String? = null
    private var mGradleVersion: String? = null
    private var mMainManifestFile: File? = null
    private var mSecondaryManifestFiles: List<File>? = null
    private var mOutputFile: File? = null

    fun setGradlePluginVersion(gradlePluginVersion: String) {
        mGradlePluginVersion = gradlePluginVersion
    }

    fun setGradleVersion(gradleVersion: String) {
        mGradleVersion = gradleVersion
    }

    fun setMainManifestFile(mainManifestFile: File) {
        mMainManifestFile = mainManifestFile
    }

    fun setSecondaryManifestFiles(sm: List<File>) {
        mSecondaryManifestFiles = sm
    }

    fun setOutputFile(outputFile: File) {
        mOutputFile = outputFile
    }

    open fun doTaskAction() {
        try {
            doFullTaskAction()
        } catch (e: IllegalStateException) {
            Logging.info("Gradle Plugin Version: $mGradlePluginVersion")
            Logging.info("Gradle Version: $mGradleVersion")
            Logging.log(e.stackTraceToString())
        }
    }

    private fun doFullTaskAction() {
        val iLogger: ILogger = LoggerWrapper(logger)
        val mergerInvoker = ManifestMerger2.newMerger(mMainManifestFile, iLogger, ManifestMerger2.MergeType.LIBRARY)

        val secondaryManifestFiles = mSecondaryManifestFiles
        val manifestProviders = mutableListOf<ManifestProvider>()

        val filteredSecondaryManifests = secondaryManifestFiles?.filter { it.exists() }
        filteredSecondaryManifests?.forEach { file ->
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

        BufferedWriter(OutputStreamWriter(FileOutputStream(mOutputFile!!), "UTF-8")).use { writer ->
            writer.append(mergingReport.getMergedDocument(MergingReport.MergedManifestKind.MERGED))
            writer.flush()
        }
    }
}
