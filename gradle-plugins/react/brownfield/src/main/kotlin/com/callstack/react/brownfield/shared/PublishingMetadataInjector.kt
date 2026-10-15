package com.callstack.react.brownfield.shared

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import groovy.util.Node
import groovy.util.NodeList
import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication
import org.gradle.api.publish.tasks.GenerateModuleMetadata

/**
 * Removes every `<dependency>` matching [shouldExclude] from [dependenciesNode], then appends one
 * per entry in [dependencies].
 *
 * Removal must run before appending: [shouldExclude] matches on coordinate alone, so afterwards it
 * couldn't tell a stale superseded entry from the one just appended for it, and would drop both.
 */
internal fun mutatePomDependenciesNode(
    dependenciesNode: Node,
    dependencies: VersionMediatingDependencySet,
    shouldExclude: (groupId: String, artifactId: String) -> Boolean,
) {
    dependenciesNode.children()
        .filterIsInstance<Node>()
        .filter { dependency ->
            val groupId = (dependency["groupId"] as NodeList).text()
            val artifactId = (dependency["artifactId"] as NodeList).text()
            shouldExclude(groupId, artifactId)
        }
        .forEach { dependency ->
            dependenciesNode.remove(dependency)
        }

    dependencies.forEach { dependencyToAdd ->
        val childTags =
            mutableMapOf(
                "groupId" to dependencyToAdd.groupId,
                "artifactId" to dependencyToAdd.artifactId,
                "scope" to dependencyToAdd.scope,
                "optional" to dependencyToAdd.optional.toString(),
            )

        if (dependencyToAdd.version?.isNotBlank() == true) {
            childTags["version"] = dependencyToAdd.version
        }

        dependenciesNode.appendNode("dependency").let { newDepNode ->
            childTags.forEach { (tagName, tagValue) ->
                newDepNode.appendNode(tagName, tagValue)
            }
        }
    }
}

/**
 * The POM's `<dependencies>` element, created if absent — a publication with no dependencies has
 * none, and `first()` throws on it. Extracted so tests exercise this code rather than
 * reimplementing the fallback and passing regardless of what production does.
 */
internal fun resolveOrCreateDependenciesNode(root: Node): Node =
    (root.get("dependencies") as NodeList).firstOrNull() as? Node
        ?: root.appendNode("dependencies")

/**
 * The `module.json` equivalent of [mutatePomDependenciesNode], applied to every variant's
 * `dependencies` list. Same removal-before-append requirement, for the same reason.
 */
internal fun mutateModuleJsonVariants(
    json: Map<*, *>,
    dependencies: VersionMediatingDependencySet,
    shouldExclude: (groupId: String, artifactId: String) -> Boolean,
) {
    @Suppress("UNCHECKED_CAST")
    (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
        (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll {
            val group = it["group"] as String
            val module = it["module"] as String
            shouldExclude(group, module)
        }
    }

    dependencies.forEach { dependencyToAdd ->
        @Suppress("UNCHECKED_CAST")
        (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
            // Known gap: every dependency lands in every variant, so runtime-scoped ones are
            // compile-visible to Gradle consumers. A fix must key on provenance, NOT on
            // `scope`, which means different things per path: on the Expo path "runtime" is what
            // Gradle emits for `implementation` (73 of 84 deps across the upstream Expo POMs), on
            // the RNC path it means `runtimeOnly`. Filtering on it would strip react-android and
            // appcompat from Expo consumers. Needs a `fromRuntimeOnlyConfiguration` flag on
            // DependencyInfo, and its own PR.
            (variant["dependencies"] as? MutableList<MutableMap<String, Any>>)?.add(
                mutableMapOf<String, Any>(
                    "group" to dependencyToAdd.groupId,
                    "module" to dependencyToAdd.artifactId,
                ).apply {
                    dependencyToAdd.version?.let { version ->
                        put("version", mapOf("requires" to version))
                    }
                },
            )
        }
    }
}

/**
 * Injects transitive dependencies into the generated Maven POM and Gradle Module Metadata for
 * every `MavenPublication` on [project], removing any existing entry the exclusion predicate
 * matches. Used identically by the Expo and RNC-CLI paths.
 *
 * Hooks are registered eagerly on construction, since Gradle disallows registering tasks from
 * `afterEvaluate`. The dependency set isn't known until then, so [configure] supplies it later;
 * until it's called, injection is disabled and the hooks are no-ops.
 */
class PublishingMetadataInjector(private val project: Project) {
    private var dependencies = VersionMediatingDependencySet()
    private var shouldExclude: (groupId: String, artifactId: String) -> Boolean = { _, _ -> false }
    private var enabled = false

    init {
        registerModuleJsonInjectors()
        registerPomInjector()
    }

    /** Supplies the dependencies to inject and enables injection on the hooks registered in [init]. */
    fun configure(
        dependencies: VersionMediatingDependencySet,
        shouldExclude: (groupId: String, artifactId: String) -> Boolean,
    ) {
        this.dependencies = dependencies
        this.shouldExclude = shouldExclude
        this.enabled = true
    }

    private fun registerModuleJsonInjectors() {
        // One task, not one per publication registered from a GenerateModuleMetadata
        // configureEach — that crashes with "DefaultTaskContainer#register(String) ... cannot be
        // executed in the current context". Walking each task's outputFile at execution time also
        // avoids hardcoding a publication name. Name is namespaced: see Constants.
        val removeDependenciesFromModuleFileTask =
            project.tasks.register(Constants.MODULE_METADATA_POST_PROCESS_TASK_NAME)
        removeDependenciesFromModuleFileTask.configure { task ->
            task.onlyIf { enabled }
            task.doLast {
                project.tasks.withType(GenerateModuleMetadata::class.java).forEach { metadataTask ->
                    val moduleFile = metadataTask.outputFile.get().asFile
                    if (!moduleFile.exists()) return@forEach

                    val json = moduleFile.inputStream().use { JsonSlurper().parse(it) as Map<*, *> }
                    mutateModuleJsonVariants(json, dependencies, shouldExclude)
                    moduleFile.writer().use {
                        it.write(JsonOutput.prettyPrint(JsonOutput.toJson(json)))
                    }
                }
            }
        }

        // Finalizing with an already-registered task is safe here, unlike registering one.
        project.tasks.withType(GenerateModuleMetadata::class.java).configureEach { metadataTask ->
            metadataTask.finalizedBy(removeDependenciesFromModuleFileTask)
        }
    }

    private fun registerPomInjector() {
        project.pluginManager.withPlugin("maven-publish") {
            project.extensions.configure(PublishingExtension::class.java) { publishing ->
                publishing.publications.withType(MavenPublication::class.java)
                    .configureEach { pub ->
                        pub.pom.withXml {
                            if (!enabled) return@withXml

                            val root = it.asNode()
                            val dependenciesNode = resolveOrCreateDependenciesNode(root)
                            mutatePomDependenciesNode(dependenciesNode, dependencies, shouldExclude)
                        }
                    }
            }
        }
    }
}
