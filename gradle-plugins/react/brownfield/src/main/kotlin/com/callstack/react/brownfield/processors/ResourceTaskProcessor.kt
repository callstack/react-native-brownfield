package com.callstack.react.brownfield.processors

import com.android.build.api.dsl.LibraryExtension
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.api.variant.LibraryVariant
import com.android.ide.common.rendering.api.ResourceNamespace
import com.android.ide.common.resources.MergeConsumer
import com.android.ide.common.resources.ResourceMerger
import com.android.ide.common.resources.ResourceMergerItem
import com.android.ide.common.resources.ResourceSet
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.GradleILogger
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.DefaultTask
import org.gradle.api.Project
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.TaskProvider
import org.w3c.dom.Element
import org.w3c.dom.Node
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult

@CacheableTask
abstract class CopyExplodedResTask : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val inputResDirs: ConfigurableFileCollection

    /** The module's own resources, which win over every library's, as an app's do over its dependencies. */
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val moduleResDirs: ConfigurableFileCollection

    /** `type/name` of the module's `resValue`s, which also win over every library's. */
    @get:Input
    abstract val moduleResValues: ListProperty<String>

    /** The first library wins on a duplicate, so the order is part of the input. */
    @get:Input
    abstract val libraryOrder: ListProperty<String>

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    /**
     * Every exploded AAR keeps its values in `res/values/values.xml`, so libraries can't simply be
     * copied over each other (#490), and keeping a resource twice in one dir fails the build (#125).
     * AGP's own merger picks the winners, with the precedence it uses in an app: the module's own
     * resources, then the first library.
     */
    @TaskAction
    fun run() {
        val out = outputDirectory.get().asFile
        out.deleteRecursively()
        out.mkdirs()
        val iLogger = GradleILogger(logger)
        val moduleDirs = moduleResDirs.filter { it.exists() }.toList()
        // 0 keeps every versioned resource. AGP applies the module's minSdk when it merges this dir.
        val merger = ResourceMerger(0)
        // Lowest priority first.
        inputResDirs.filter { it.exists() }.reversed().forEachIndexed { index, resDir ->
            merger.addDataSet(resourceSet("library$index", resDir, isLibrary = true, iLogger))
        }
        // One set per dir: two module dirs may override each other, like main and a flavor.
        moduleDirs.forEachIndexed { index, resDir ->
            merger.addDataSet(resourceSet("module$index", resDir, isLibrary = false, iLogger))
        }
        val writer = LibraryResWriter(moduleDirs, moduleResValues.get().toSet())
        merger.mergeData(writer, false)
        writer.messages.forEach { logger.warn("Brownfield: $it") }
        writer.writeTo(out)
    }

    private fun resourceSet(
        name: String,
        resDir: File,
        isLibrary: Boolean,
        iLogger: GradleILogger,
    ) = ResourceSet(name, ResourceNamespace.RES_AUTO, if (isLibrary) name else null, false, null).apply {
        addSource(resDir)
        loadFromFiles(iLogger)
    }
}

/**
 * Writes the merged library resources that the module doesn't define itself. AGP ranks this generated
 * dir above the module's own res, so a library copy of a module resource would win there.
 */
private class LibraryResWriter(
    private val moduleDirs: List<File>,
    private val moduleResValues: Set<String>,
) : MergeConsumer<ResourceMergerItem> {
    private val files = mutableListOf<Pair<String, File>>()
    private val values = sortedMapOf<String, MutableList<Node>>()
    private val moduleAttrs = mutableMapOf<String, MutableSet<String>>()
    private val styleableAttrWinners = mutableMapOf<String, MutableList<Node>>()
    val messages = mutableListOf<String>()

    override fun start(factory: DocumentBuilderFactory) = Unit

    override fun end() = Unit

    override fun removeItem(
        removedItem: ResourceMergerItem,
        replacedBy: ResourceMergerItem?,
    ) = Unit

    override fun ignoreItemInMerge(item: ResourceMergerItem) = false

    override fun addItem(item: ResourceMergerItem) {
        val folder = valuesFolder(item.qualifiers)
        val source = item.sourceFile?.file
        if (source != null && moduleDirs.any { source.startsWith(it) }) {
            if (item.type.getName() == "attr") moduleAttrs.getOrPut(folder) { mutableSetOf() }.add(item.name)
            return
        }
        if (item.qualifiers.isEmpty() && "${item.type.getName()}/${item.name}" in moduleResValues) return
        // An attr declared inside a styleable. The merger picked this one, so it becomes the definition.
        if (item.ignoredFromDiskMerge) {
            styleableAttrWinners.getOrPut(folder) { mutableListOf() }.add(item.value)
            return
        }
        if (item.isFileBased && source != null) {
            files.add("${source.parentFile.name}/${source.name}" to source)
        } else {
            values.getOrPut(folder) { mutableListOf() }.add(item.value)
        }
    }

    fun writeTo(out: File) {
        files.forEach { (path, file) -> file.copyTo(File(out, path)) }
        val transformer = TransformerFactory.newInstance().newTransformer()
        (values.keys + styleableAttrWinners.keys).toSortedSet().forEach { folder ->
            val nodes = values[folder].orEmpty()
            val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument()
            val root = document.createElement("resources")
            document.appendChild(root)
            nodes.forEach { root.appendChild(document.importNode(it, true)) }
            styleableAttrWinners[folder].orEmpty().forEach { root.appendChild(document.importNode(it, true)) }
            keepOneAttrDefinition(root, folder, moduleAttrs[folder].orEmpty())
            val target = File(out, "$folder/$folder.xml")
            target.parentFile.mkdirs()
            transformer.transform(DOMSource(document), StreamResult(target))
        }
    }

    /**
     * AGP also registers an attr with a `format` (or enum/flag values) inside a styleable as its own
     * `attr/<name>`, so one dir may define it only once. The merger's winner is written as a top-level
     * attr, and every styleable copy, or one of an attr the module defines, becomes a plain reference.
     */
    private fun keepOneAttrDefinition(
        root: Element,
        folder: String,
        moduleAttrs: Set<String>,
    ) {
        val defined = root.childElements().filter { it.tagName == "attr" }.associateBy { it.getAttribute("name") }
        root.childElements()
            .filter { it.tagName == "declare-styleable" }
            .flatMap { it.childElements() }
            .filter { it.tagName == "attr" && !it.getAttribute("name").startsWith("android:") }
            .filter { definition(it).isNotEmpty() }
            .forEach { attr ->
                val name = attr.getAttribute("name")
                val winner = defined[name]
                if (winner == null && name !in moduleAttrs) return@forEach
                if (winner != null && definition(winner) != definition(attr)) {
                    messages.add("$folder: attr/$name is defined differently by two libraries, keeping the first")
                }
                attr.removeAttribute("format")
                attr.childElements().forEach { attr.removeChild(it) }
            }
    }

    /** Format and enum/flag values of an attr; empty for a plain reference. */
    private fun definition(attr: Element): String =
        attr.getAttribute("format") +
            attr.childElements().joinToString { "${it.tagName}:${it.getAttribute("name")}=${it.getAttribute("value")}" }

    private fun valuesFolder(qualifiers: String) = if (qualifiers.isEmpty()) "values" else "values-$qualifiers"

    private fun Element.childElements(): List<Element> {
        val children = childNodes
        return (0 until children.length).map { children.item(it) }.filterIsInstance<Element>()
    }
}

object ResourceTaskProcessor {
    private const val RES_VALUES_OFF_BY_DEFAULT_SINCE_AGP = 9

    fun process(
        project: Project,
        variant: LibraryVariant,
        aarLibraries: List<AndroidArchiveLibrary>,
        explodeTask: TaskProvider<ExplodeAarTask>,
    ) {
        val capitalized = variant.name.capitalized()
        val resDirs = aarLibraries.map { it.getResDir() }
        val buildDir = project.layout.buildDirectory.get().asFile
        val copyResTask =
            project.tasks.register(
                "copyExplodedResFor$capitalized",
                CopyExplodedResTask::class.java,
            ) { task ->
                task.inputResDirs.setFrom(resDirs)
                if (resValuesEnabled(project)) {
                    task.moduleResValues.set(variant.resValues.map { values -> values.keys.map { "${it.type}/${it.name}" } })
                } else {
                    task.moduleResValues.set(emptyList())
                }
                variant.sources.res?.static?.let { static -> task.moduleResDirs.from(static.map { layers -> layers.flatten() }) }
                task.libraryOrder.set(aarLibraries.map { it.getExplodedAarRootDir().relativeTo(buildDir).invariantSeparatorsPath })
                task.dependsOn(explodeTask)
            }

        variant.sources.res?.addGeneratedSourceDirectory(
            copyResTask,
            CopyExplodedResTask::outputDirectory,
        )
    }

    /** AGP warns on every read of `variant.resValues` while the feature is off, the default from AGP 9 on. */
    private fun resValuesEnabled(project: Project): Boolean {
        val explicit = project.extensions.getByType(LibraryExtension::class.java).buildFeatures.resValues
        val default = project.providers.gradleProperty("android.defaults.buildfeatures.resvalues").orNull?.toBooleanStrictOrNull()
        val agpMajor = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java).pluginVersion.major
        return explicit ?: default ?: (agpMajor < RES_VALUES_OFF_BY_DEFAULT_SINCE_AGP)
    }
}
