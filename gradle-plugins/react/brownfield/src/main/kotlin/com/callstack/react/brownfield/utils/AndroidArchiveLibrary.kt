package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import org.gradle.api.Project
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

class AndroidArchiveLibrary(
    private val project: Project,
    artifact: UnresolvedArtifactInfo,
    private val variantName: String,
) {
    private var packageName: String? = null
    private val artifact: UnresolvedArtifactInfo =
        requireNotNull(artifact.takeIf { it.type == "aar" }) {
            "Only Aar is accepted as an artifact"
        }

    fun getExplodedAarRootDir(): File {
        val explodedRootDir = File("${project.layout.buildDirectory.get()}/intermediates/exploded-aar")
        return File(explodedRootDir, "${artifact.moduleGroup}/${artifact.moduleName}/${artifact.moduleVersion}/$variantName")
    }

    @Synchronized
    fun getPackageName(): String {
        if (packageName != null) return packageName!!

        packageName = getNameSpaceFromBuildGradle()
        return packageName!!
    }

    private fun getNameSpaceFromBuildGradle(): String {
        if (artifact.isExpoPublishDependency == true) {
            return artifact.moduleGroup
        }

        val subProj = project.rootProject.project(":${artifact.moduleName}")
        val buildFile = subProj.buildFile // points to build.gradle or build.gradle.kts

        if (!buildFile.exists()) {
            error("build.gradle file does not exist for ${artifact.moduleName}")
        }

        val text = buildFile.readText()

        // Regex to match: namespace = "com.example.rnscreens"
        val regex = Regex("""namespace\s*=?\s*["']([^"']+)["']""")
        val match = regex.find(text)

        return match?.groupValues?.get(1)
            ?: getNameSpaceFromAndroidManifest(subProj)
            ?: error(
                "No namespace found in ${buildFile.path}, and no package attribute found in " +
                    "AndroidManifest.xml for ${artifact.moduleName}",
            )
    }

    /**
     * Falls back to the `package` attribute of the dependency's `AndroidManifest.xml` when the
     * module declares no `namespace` in its `build.gradle`. The Android Gradle plugin itself
     * derives the namespace this way for such libraries, so they build fine as a regular
     * dependency but trip up [getNameSpaceFromBuildGradle]'s `build.gradle`-only regex.
     *
     * The manifest is parsed as XML and only the root `<manifest>` element's `package`
     * attribute is read, so comments or child attributes such as `android:targetPackage`
     * cannot be mistaken for the package name.
     */
    private fun getNameSpaceFromAndroidManifest(subProj: Project): String? {
        val candidateManifests =
            listOf(
                File(subProj.projectDir, "src/main/AndroidManifest.xml"),
                File(subProj.projectDir, "AndroidManifest.xml"),
            )

        return candidateManifests
            .filter { it.exists() }
            .firstNotNullOfOrNull { manifestFile ->
                runCatching {
                    val document =
                        DocumentBuilderFactory.newInstance().apply {
                            isNamespaceAware = true
                            setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
                            setFeature("http://xml.org/sax/features/external-general-entities", false)
                            setFeature("http://xml.org/sax/features/external-parameter-entities", false)
                        }.newDocumentBuilder().parse(manifestFile)
                    document.documentElement
                        ?.getAttribute("package")
                        ?.takeIf { it.isNotBlank() }
                }.getOrNull()
            }
    }

    fun getManifestFile() = File(getExplodedAarRootDir(), "AndroidManifest.xml")

    fun getAssetsDir(): File = File(getExplodedAarRootDir(), "assets")

    fun getJniDir(): File = File(getExplodedAarRootDir(), "jni")

    fun getLibsDir(): File = File(getExplodedAarRootDir(), "libs")

    fun getClassesJarFile(): File = File(getExplodedAarRootDir(), "classes.jar")

    fun getLocalJars(): Collection<File> {
        return getLibsDir().listFiles()?.filter { it.isFile && it.name.endsWith(".jar") } ?: emptyList()
    }

    fun getResDir(): File = File(getExplodedAarRootDir(), "res")

    fun getProguardRules(): File = File(getExplodedAarRootDir(), "proguard.txt")
}
