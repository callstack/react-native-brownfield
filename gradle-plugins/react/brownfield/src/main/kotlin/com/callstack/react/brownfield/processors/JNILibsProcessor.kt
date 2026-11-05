package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.DefaultTask
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.Optional
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.TaskProvider
import java.io.File

/**
 * Below contains a list of dynamic libs which we should not embed
 * with the AAR as they are provided by the Gradle when AAR is
 * consumed by the host App.
 */
val IGNORE_EMBEDDED_LIBS =
    listOf(
        "libc++_shared.so", "libfbjni.so", "libhermestooling.so",
        "libhermesvm.so", "libimagepipeline.so", "libjsi.so",
        "libnative-filters.so", "libnative-imagetranscoder.so",
        "libreactnative.so",
    )

private val ABIS = listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")

private const val APP_MODULES_LIB = "libappmodules.so"

internal enum class SkipReason { IGNORED, NOT_EMBEDDED }

/**
 * @property copies source file for each `<abi>/<name>` that goes into the AAR
 * @property unmatchedDynamicLibs dynamicLibs entries that match no file in the app module's output
 * @property skipped every lib name that no ABI copies, with why
 * @property ignoredDynamicLibs dynamicLibs entries dropped because an ignore entry matches them
 * @property excludedAbis ABIs the embedded AARs ship but the app module did not build
 */
internal data class JniLibsPlan(
    val copies: Map<String, File>,
    val unmatchedDynamicLibs: Set<String>,
    val skipped: Map<String, SkipReason>,
    val ignoredDynamicLibs: Set<String> = emptySet(),
    val excludedAbis: Set<String> = emptySet(),
)

private fun isAppOwned(name: String) = name == APP_MODULES_LIB || (name.startsWith("libreact_codegen_") && name.endsWith(".so"))

private fun isIgnored(
    name: String,
    ignoredLibs: List<String>,
) = ignoredLibs.any { entry -> name == entry || name.contains(entry) }

private fun libNames(dir: File?): List<String> = dir?.listFiles()?.filter { it.isFile }?.map { it.name }.orEmpty()

/**
 * Picks the .so files for the AAR: the app module's own libs, the libs the embedded libraries
 * ship, and [dynamicLibs], minus [ignoredLibs]. Libs that only come from Maven dependencies stay
 * out, because the host app gets them through the published POM.
 */
internal fun planJniLibs(
    aarJniDirs: List<File>,
    appNativeLibsDir: File?,
    ignoredLibs: List<String>,
    dynamicLibs: List<String>,
): JniLibsPlan {
    val copies = linkedMapOf<String, File>()
    val matchedDynamicLibs = mutableSetOf<String>()
    val candidates = mutableMapOf<String, SkipReason>()
    val ignoredDynamicLibs = mutableSetOf<String>()

    // An ABI folder without libappmodules.so crashes on devices that pick it, so follow the app
    // module's ABIs (it may use abiFilters) and only fall back to all of them when it built none.
    val appAbis = ABIS.filter { abi -> appNativeLibsDir?.let { File(it, abi).isDirectory } == true }
    val abis = appAbis.ifEmpty { ABIS }
    val excludedAbis = ABIS.filter { abi -> abi !in abis && aarJniDirs.any { File(it, abi).isDirectory } }.toSet()

    for (abi in abis) {
        val appAbiDir = appNativeLibsDir?.let { File(it, abi) }
        val appNames = libNames(appAbiDir).toSet()

        val embedded = linkedMapOf<String, File>()
        aarJniDirs.forEach { jniDir ->
            val abiDir = File(jniDir, abi)
            libNames(abiDir).forEach { name -> embedded.putIfAbsent(name, File(abiDir, name)) }
        }
        val extra = dynamicLibs.filter { it in appNames }
        matchedDynamicLibs += extra
        ignoredDynamicLibs += extra.filter { isIgnored(it, ignoredLibs) }

        val wanted = appNames.filter(::isAppOwned) + (embedded.keys + extra).filterNot { isIgnored(it, ignoredLibs) }
        wanted.forEach { name ->
            copies["$abi/$name"] = appAbiDir?.let { File(it, name) }?.takeIf { it.isFile } ?: embedded.getValue(name)
        }

        (appNames + embedded.keys).filterNot { it in wanted }.forEach { name ->
            val reason = if (isIgnored(name, ignoredLibs)) SkipReason.IGNORED else SkipReason.NOT_EMBEDDED
            // IGNORED wins: once a name is ignored in one ABI it is ignored everywhere.
            if (candidates[name] != SkipReason.IGNORED) candidates[name] = reason
        }
    }

    val copiedNames = copies.keys.map { it.substringAfter('/') }.toSet()
    return JniLibsPlan(
        copies = copies,
        unmatchedDynamicLibs = dynamicLibs.toSet() - matchedDynamicLibs,
        skipped = candidates.filterKeys { it !in copiedNames }.toSortedMap(),
        ignoredDynamicLibs = ignoredDynamicLibs,
        excludedAbis = excludedAbis,
    )
}

internal fun planWarnings(plan: JniLibsPlan): List<String> =
    plan.unmatchedDynamicLibs.map { entry ->
        "Brownfield: dynamicLibs entry '$entry' matches no .so file in the app module's native output."
    } +
        plan.ignoredDynamicLibs.map { name ->
            "Brownfield: dynamicLibs entry '$name' is not in the AAR because an ignore entry matches it. " +
                "Remove that entry from ignoreEmbeddedLibs to embed it."
        }

/**
 * One line naming the libs no embedded library ships, or null when there are none. Ignored libs
 * are left out: they are skipped on purpose and would only add noise on every build.
 */
internal fun skippedSummary(
    plan: JniLibsPlan,
    reportFile: File?,
): String? {
    val names = plan.skipped.filterValues { it == SkipReason.NOT_EMBEDDED }.keys.sorted()
    if (names.isEmpty()) return null
    val details = reportFile?.let { " Details: ${it.absolutePath}" }.orEmpty()
    return "Brownfield: left ${names.size} .so file(s) out of the AAR because no embedded library ships them: " +
        "${names.joinToString(", ")}. If one comes from a Maven dependency, the host app gets it through the POM. " +
        "If not (for example, your app module builds or ships it), add it to reactBrownfield.dynamicLibs.$details"
}

internal data class AppNativeLibsSource(val relativeDir: String, val producerTaskName: String)

internal fun appNativeLibsSource(
    variantName: String,
    useStrippedSoFiles: Boolean,
): AppNativeLibsSource {
    val capitalized = variantName.capitalized()
    return if (useStrippedSoFiles) {
        val task = "strip${capitalized}DebugSymbols"
        AppNativeLibsSource("intermediates/stripped_native_libs/$variantName/$task/out/lib", task)
    } else {
        val task = "merge${capitalized}NativeLibs"
        AppNativeLibsSource("intermediates/merged_native_libs/$variantName/$task/out/lib", task)
    }
}

@CacheableTask
abstract class ProcessAndCopyJniLibsTask : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val aarJniDirs: ConfigurableFileCollection

    // @InputFiles rather than @InputDirectory: a variant without native code has no such dir,
    // and @InputDirectory would fail validation before the task can run.
    @get:InputFiles
    @get:Optional
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val appNativeLibsDir: DirectoryProperty

    @get:Input
    abstract val extraIgnoredLibs: ListProperty<String>

    @get:Input
    abstract val dynamicLibs: ListProperty<String>

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    // A declared output, so it is restored on cache hits when nothing is logged.
    @get:OutputFile
    abstract val skippedReportFile: RegularFileProperty

    @TaskAction
    fun execute() {
        val outDir = outputDirectory.get().asFile
        outDir.deleteRecursively()
        outDir.mkdirs()

        val appDir = appNativeLibsDir.orNull?.asFile
        if (appDir != null && !appDir.exists()) {
            logger.warn(
                "Brownfield: $appDir does not exist, so libappmodules.so and libreact_codegen_*.so " +
                    "were not found and are not in the AAR.",
            )
        }

        val plan =
            planJniLibs(
                aarJniDirs.files.toList(),
                appDir,
                IGNORE_EMBEDDED_LIBS + extraIgnoredLibs.getOrElse(emptyList()),
                dynamicLibs.getOrElse(emptyList()),
            )

        plan.copies.forEach { (path, source) -> source.copyTo(File(outDir, path), overwrite = true) }

        writeReport(plan)
        val reportFile = skippedReportFile.get().asFile
        skippedSummary(plan, reportFile)?.let { logger.lifecycle(it) }
        plan.skipped.forEach { (name, reason) -> logger.info("Brownfield: skipped $name ($reason)") }
        planWarnings(plan).forEach { logger.warn(it) }
        if (plan.excludedAbis.isNotEmpty()) {
            logger.info("Brownfield: left out ABIs the app module did not build: ${plan.excludedAbis.sorted().joinToString(", ")}")
        }
    }

    private fun writeReport(plan: JniLibsPlan) {
        val reportFile = skippedReportFile.get().asFile
        reportFile.parentFile.mkdirs()
        val lines =
            if (plan.skipped.isEmpty()) {
                listOf("No .so files were left out.")
            } else {
                listOfNotNull(skippedSummary(plan, null)) + plan.skipped.map { (name, reason) -> "$name: $reason" }
            }
        reportFile.writeText(lines.joinToString("\n", postfix = "\n"))
    }
}

internal fun wireAarJniDirs(
    task: ProcessAndCopyJniLibsTask,
    jniDirs: List<File>,
    explodeTask: TaskProvider<out Task>,
) {
    // The dirs are plain paths, so Gradle can't infer who fills them; without this the task can
    // run before the AARs are unpacked and drop every embedded lib.
    task.aarJniDirs.setFrom(jniDirs)
    task.aarJniDirs.builtBy(explodeTask)
}

internal fun configureProcessJniTask(
    task: ProcessAndCopyJniLibsTask,
    project: Project,
    appProject: Project,
    projectExt: Extension,
    variantName: String,
    jniDirs: List<File>,
    explodeTask: TaskProvider<out Task>,
) {
    val source = appNativeLibsSource(variantName, projectExt.useStrippedSoFiles)

    task.extraIgnoredLibs.set(projectExt.ignoreEmbeddedLibs)
    task.dynamicLibs.set(projectExt.dynamicLibs)
    wireAarJniDirs(task, jniDirs, explodeTask)
    task.appNativeLibsDir.set(appProject.layout.buildDirectory.dir(source.relativeDir))
    task.skippedReportFile.set(project.layout.buildDirectory.file("reports/brownfield/$variantName/skipped-so.txt"))

    task.dependsOn(
        "${appProject.path}:${source.producerTaskName}",
        "${project.path}:generateCodegenSchemaFromJavaScript",
    )
}

class JNILibsProcessor(val project: Project) {
    fun processJniLibs(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        variant: LibraryVariant,
        explodeTask: TaskProvider<out Task>,
    ) {
        val variantName = variant.name
        val capitalizedVariantName = variantName.capitalized()
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val processJniTask =
            project.tasks.register("processCustomJniLibsFor$capitalizedVariantName", ProcessAndCopyJniLibsTask::class.java) {
                val jniDirs = aarLibraries.map { aarLib -> aarLib.getJniDir() }
                configureProcessJniTask(it, project, appProject, projectExt, variantName, jniDirs, explodeTask)
            }

        variant.sources.jniLibs?.addGeneratedSourceDirectory(
            taskProvider = processJniTask,
            wiredWith = { it.outputDirectory },
        )
    }
}
