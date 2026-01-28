package com.callstack.react.brownfield.utils

import com.android.build.gradle.LibraryExtension
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import org.gradle.api.Project
import java.io.File

class AndroidArchiveLibrary(
    private val project: Project,
    artifact: UnresolvedArtifactInfo,
    private val variantName: String,
) {
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
        val androidExtension = project.rootProject.project(":${artifact.moduleName}").extensions.getByType(LibraryExtension::class.java)
        return androidExtension.namespace!!
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
