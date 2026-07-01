package com.callstack.react.brownfield.shared

import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.ManifestSystemProperty
import com.android.manifmerger.MergingReport
import org.apache.tools.ant.BuildException
import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.MapProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.CacheableTask
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
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult

@CacheableTask
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

        val tempDir = temporaryDir
        val (sanitizedManifestFile, extractedSdkVersions) =
            stripSdkVersionsFromManifest(mainManifestFile, tempDir)

        try {
            val iLogger = GradleILogger(logger)
            val mergerInvoker =
                ManifestMerger2
                    .newMerger(sanitizedManifestFile, iLogger, ManifestMerger2.MergeType.LIBRARY)
                    .setNamespace(namespace.get())
                    .setPlaceHolderValues(manifestPlaceholders.get().mapValues { it.value as Any })

            extractedSdkVersions.forEach { (property, value) ->
                mergerInvoker.setOverride(property, value)
            }

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

            val mergedDocument =
                mergingReport.getMergedDocument(MergingReport.MergedManifestKind.MERGED)
                    ?: throw BuildException("Manifest merge produced no output for variant ${variantName.get()}")
            outputFile.writeText(mergedDocument, Charsets.UTF_8)
        } finally {
            sanitizedManifestFile.delete()
        }
    }

    /**
     * AGP 9.0+ ManifestMerger2 rejects a main manifest that contains <uses-sdk> with SDK-version
     * attributes (minSdkVersion / targetSdkVersion / maxSdkVersion), because those values are
     * already tracked by the build system. This helper parses the manifest with the DOM API,
     * removes only those offending attributes, drops the <uses-sdk> element entirely when no
     * meaningful attributes remain, and writes the result to a temporary file in [tempDir]
     * (Gradle's task-private scratch area, outside the declared outputs).
     *
     * It returns both the sanitized temp file and a map of the stripped SDK version values so the
     * caller can restore them via ManifestMerger2.Invoker.setOverride(), keeping merger behaviour
     * identical to before while satisfying the new validation.
     */
    private fun stripSdkVersionsFromManifest(
        manifestFile: File,
        tempDir: File,
    ): Pair<File, Map<ManifestSystemProperty, String>> {
        val sdkVersionAttributes =
            mapOf(
                "minSdkVersion" to ManifestSystemProperty.UsesSdk.MIN_SDK_VERSION,
                "targetSdkVersion" to ManifestSystemProperty.UsesSdk.TARGET_SDK_VERSION,
                "maxSdkVersion" to ManifestSystemProperty.UsesSdk.MAX_SDK_VERSION,
            )
        val androidNs = "http://schemas.android.com/apk/res/android"

        val document =
            DocumentBuilderFactory.newInstance().apply {
                isNamespaceAware = true
                setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
                setFeature("http://xml.org/sax/features/external-general-entities", false)
                setFeature("http://xml.org/sax/features/external-parameter-entities", false)
            }.newDocumentBuilder().parse(manifestFile)

        val usesSdkNodes = document.getElementsByTagNameNS("*", "uses-sdk")
        val nodesToRemove = mutableListOf<org.w3c.dom.Element>()
        val extractedSdkVersions = mutableMapOf<ManifestSystemProperty, String>()

        for (i in 0 until usesSdkNodes.length) {
            val element = usesSdkNodes.item(i) as? org.w3c.dom.Element ?: continue

            sdkVersionAttributes.forEach { (attrName, property) ->
                val value = element.getAttributeNS(androidNs, attrName)
                if (value.isNotEmpty()) {
                    extractedSdkVersions[property] = value
                    element.removeAttributeNS(androidNs, attrName)
                }
            }

            val remainingAttrs = element.attributes
            val hasMeaningfulRemainingAttrs =
                (0 until remainingAttrs.length).any { j ->
                    val attr = remainingAttrs.item(j)
                    attr.prefix != "xmlns" && attr.nodeName != "xmlns"
                }

            if (!hasMeaningfulRemainingAttrs) {
                nodesToRemove.add(element)
            }
        }

        nodesToRemove.forEach { it.parentNode?.removeChild(it) }

        tempDir.mkdirs()
        val tempFile = File(tempDir, "sanitized_${manifestFile.name}")
        TransformerFactory.newInstance().newTransformer().transform(
            DOMSource(document),
            StreamResult(tempFile),
        )

        return Pair(tempFile, extractedSdkVersions)
    }
}
