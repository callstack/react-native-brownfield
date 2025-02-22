package com.callstack.rnbrownfield.utils

import com.callstack.rnbrownfield.shared.Logging
import org.gradle.api.Project
import org.gradle.api.artifacts.ResolvedArtifact
import java.io.File
import java.io.FileNotFoundException
import javax.xml.parsers.DocumentBuilderFactory

class AndroidArchiveLibrary(
    private val project: Project,
    artifact: ResolvedArtifact,
    private val variantName: String,
) {
    private var packageName: String? = null
    private val artifact: ResolvedArtifact =
        requireNotNull(artifact.takeIf { it.type == "aar" }) {
            "Only Aar is accepted as an artifact"
        }

    private fun getArtifactName() = artifact.moduleVersion.id.name

    private fun getExplodedAarRootDir(): File {
        val explodedRootDir = File("${project.layout.buildDirectory.get()}/intermediates/exploded-aar")
        val id = artifact.moduleVersion.id
        return File(explodedRootDir, "${id.group}/${id.name}/${id.version}/$variantName")
    }

    @Synchronized
    fun getPackageName(): String {
        if (packageName == null) {
            val manifestFile = getManifestFile()
            if (!manifestFile.exists()) {
                throw FileNotFoundException("${getArtifactName()} module's AndroidManifest file not found")
            }

            try {
                val documentBuilderFactory = DocumentBuilderFactory.newInstance()
                val document = documentBuilderFactory.newDocumentBuilder().parse(manifestFile)
                packageName = document.documentElement.getAttribute("package")
            } catch (e: IllegalStateException) {
                Logging.log(e.stackTraceToString())
            }
        }
        return packageName!!
    }

    private fun getManifestFile() = File(getExplodedAarRootDir(), "AndroidManifest.xml")
}
