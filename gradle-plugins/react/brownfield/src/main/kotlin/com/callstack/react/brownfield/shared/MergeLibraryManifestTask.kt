package com.callstack.react.brownfield.shared

import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.MergingReport
import org.apache.tools.ant.BuildException
import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.MapProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

abstract class MergeLibraryManifestTask : DefaultTask() {
    @get:InputFile
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val inputManifest: RegularFileProperty

    @get:OutputFile
    abstract val outputManifest: RegularFileProperty

    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val aarManifestFiles: ConfigurableFileCollection

    @get:Input
    abstract val variantName: Property<String>

    @get:Input
    abstract val namespace: Property<String>

    @get:Input
    abstract val manifestPlaceholders: MapProperty<String, String>

    @TaskAction
    fun run() {
        val mainManifestFile = inputManifest.get().asFile
        val outputFile = outputManifest.get().asFile
        val dependencyManifests = aarManifestFiles.files.filter(File::exists)

        outputFile.parentFile.mkdirs()

        if (dependencyManifests.isEmpty()) {
            Files.copy(mainManifestFile.toPath(), outputFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
            return
        }

        val iLogger = GradleILogger(logger)
        val mergerInvoker =
            ManifestMerger2
                .newMerger(mainManifestFile, iLogger, ManifestMerger2.MergeType.LIBRARY)
                .setNamespace(namespace.get())
                .setPlaceHolderValues(manifestPlaceholders.get().mapValues { it.value as Any })

        mergerInvoker.addManifestProviders(
            dependencyManifests.map { manifestFile ->
                object : ManifestProvider {
                    override fun getManifest(): File = manifestFile.absoluteFile

                    override fun getName(): String = manifestFile.name
                }
            },
        )

        val mergingReport = mergerInvoker.merge()

        if (mergingReport.result.isError) {
            logger.error("Manifest merge failed for variant ${variantName.get()}")
            logger.error(mergingReport.reportString)
            mergingReport.log(iLogger)
            throw BuildException(mergingReport.reportString)
        }

        outputFile.writeText(
            mergingReport.getMergedDocument(MergingReport.MergedManifestKind.MERGED),
            Charsets.UTF_8,
        )
    }
}
