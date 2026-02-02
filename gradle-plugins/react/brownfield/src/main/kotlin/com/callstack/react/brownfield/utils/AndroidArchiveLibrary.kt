package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import org.gradle.api.Project
import java.io.File

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
        val subProj = project.rootProject.project(":${artifact.moduleName}")
        val buildFile = subProj.buildFile // points to build.gradle or build.gradle.kts

        if (!buildFile.exists()) {
            error("build.gradle file does not exist for ${artifact.moduleName}")
        }

        val text = buildFile.readText()

        // Regex to match: namespace = "com.example.rnscreens"
        val regex = Regex("""namespace\s*=?\s*["']([^"']+)["']""")
        val match = regex.find(text)

        val namespace = match?.groupValues?.get(1)
            ?: error("No namespace found in ${buildFile.path}")

        return namespace
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

    fun getDataBindingFolder(): File = File(getExplodedAarRootDir(), "data-binding")

    fun getDataBindingLogFolder(): File = File(getExplodedAarRootDir(), "data-binding-base-class-log")
}
