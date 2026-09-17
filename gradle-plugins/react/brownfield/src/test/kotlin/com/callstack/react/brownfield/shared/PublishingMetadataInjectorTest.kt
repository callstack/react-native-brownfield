package com.callstack.react.brownfield.shared

import groovy.util.NodeList
import groovy.xml.XmlParser
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PublishingMetadataInjectorTaskRegistrationTest {
    @Test
    fun `does not claim the task name the setup docs tell consumers to register`() {
        val project = ProjectBuilder.builder().build()

        PublishingMetadataInjector(project)

        assertNull(
            project.tasks.findByName(Constants.LEGACY_CONSUMER_MODULE_METADATA_TASK_NAME),
            "the plugin must leave this name free: the published setup docs tell every bare-RN " +
                "consumer to register it themselves, and the plugin applies before their script body",
        )
        assertNotNull(
            project.tasks.findByName(Constants.MODULE_METADATA_POST_PROCESS_TASK_NAME),
        )
    }

    @Test
    fun `a not-yet-migrated consumer can still register the legacy task after the plugin has run`() {
        // Reproduces the upgrade path end to end at the task-container level: the plugin registers
        // its task during apply(), then the consumer's own build script body runs and registers the
        // task the setup docs told them to. This must not throw.
        val project = ProjectBuilder.builder().build()

        PublishingMetadataInjector(project)
        project.tasks.register(Constants.LEGACY_CONSUMER_MODULE_METADATA_TASK_NAME)

        assertNotNull(project.tasks.findByName(Constants.LEGACY_CONSUMER_MODULE_METADATA_TASK_NAME))
        assertNotNull(project.tasks.findByName(Constants.MODULE_METADATA_POST_PROCESS_TASK_NAME))
    }
}

class MutatePomDependenciesNodeTest {
    private fun dependenciesNodeFrom(xml: String): groovy.util.Node {
        val root = XmlParser().parseText(xml)
        return (root.get("dependencies") as NodeList).first() as groovy.util.Node
    }

    private fun versionsFor(
        dependenciesNode: groovy.util.Node,
        groupId: String,
        artifactId: String,
    ): List<String> {
        return dependenciesNode.children()
            .filterIsInstance<groovy.util.Node>()
            .filter {
                (it["groupId"] as NodeList).text() == groupId && (it["artifactId"] as NodeList).text() == artifactId
            }
            .map { (it["version"] as NodeList).text() }
    }

    @Test
    fun `appends new dependencies with no pre-existing entries`() {
        val dependenciesNode = dependenciesNodeFrom("<project><dependencies/></project>")
        val toInject = VersionMediatingDependencySet()
        toInject.add(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false))

        mutatePomDependenciesNode(dependenciesNode, toInject) { _, _ -> false }

        assertEquals(listOf("1.17.0"), versionsFor(dependenciesNode, "androidx.core", "core-ktx"))
    }

    @Test
    fun `injects into a POM that has no dependencies element at all`() {
        // A publication with no dependencies generates <project/> with no <dependencies> child.
        // Must go through resolveOrCreateDependenciesNode — inlining the fallback here instead
        // would make this test pass even with the production path reverted to first().
        val root = XmlParser().parseText("<project/>")
        val toInject = VersionMediatingDependencySet()
        toInject.add(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false))

        val dependenciesNode = resolveOrCreateDependenciesNode(root)
        mutatePomDependenciesNode(dependenciesNode, toInject) { _, _ -> false }

        assertEquals(listOf("1.17.0"), versionsFor(dependenciesNode, "androidx.core", "core-ktx"))
    }

    @Test
    fun `reuses the existing dependencies element instead of appending a second one`() {
        val root =
            XmlParser().parseText(
                """
                <project>
                  <dependencies>
                    <dependency>
                      <groupId>androidx.core</groupId>
                      <artifactId>core-ktx</artifactId>
                      <version>1.17.0</version>
                    </dependency>
                  </dependencies>
                </project>
                """.trimIndent(),
            )

        val dependenciesNode = resolveOrCreateDependenciesNode(root)

        assertEquals(
            1,
            (root.get("dependencies") as NodeList).size,
            "a POM that already has <dependencies> must not gain a second one",
        )
        assertEquals(listOf("1.17.0"), versionsFor(dependenciesNode, "androidx.core", "core-ktx"))
    }

    @Test
    fun `removes an unrelated excluded entry that is not being re-injected`() {
        val dependenciesNode =
            dependenciesNodeFrom(
                """
                <project>
                  <dependencies>
                    <dependency>
                      <groupId>com.rnapp</groupId>
                      <artifactId>brownfieldlib</artifactId>
                      <version>unspecified</version>
                    </dependency>
                  </dependencies>
                </project>
                """.trimIndent(),
            )

        mutatePomDependenciesNode(dependenciesNode, VersionMediatingDependencySet()) { groupId, _ ->
            groupId == "com.rnapp"
        }

        assertTrue(versionsFor(dependenciesNode, "com.rnapp", "brownfieldlib").isEmpty())
    }

    @Test
    fun `a superseded stale entry is replaced by the mediated version, not left duplicated or missing`() {
        // Regression test: a consumer already hand-declares appcompat 1.6.0 directly (as the
        // pre-upgrade workaround), and an embedded module needs 1.7.1. The discoverer mediates
        // this and marks the coordinate "superseded" so shouldExclude matches it — but the
        // mediated 1.7.1 entry must still end up in the POM exactly once, not zero times.
        val dependenciesNode =
            dependenciesNodeFrom(
                """
                <project>
                  <dependencies>
                    <dependency>
                      <groupId>androidx.appcompat</groupId>
                      <artifactId>appcompat</artifactId>
                      <version>1.6.0</version>
                      <scope>runtime</scope>
                    </dependency>
                  </dependencies>
                </project>
                """.trimIndent(),
            )
        val mediated = VersionMediatingDependencySet()
        mediated.add(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false))

        mutatePomDependenciesNode(dependenciesNode, mediated) { groupId, artifactId ->
            groupId == "androidx.appcompat" && artifactId == "appcompat"
        }

        assertEquals(listOf("1.7.1"), versionsFor(dependenciesNode, "androidx.appcompat", "appcompat"))
    }
}

class MutateModuleJsonVariantsTest {
    private fun jsonWithVariant(dependencies: MutableList<MutableMap<String, Any>>): MutableMap<String, Any> {
        return mutableMapOf(
            "variants" to
                mutableListOf(
                    mutableMapOf<String, Any>(
                        "name" to "runtimeElements",
                        "dependencies" to dependencies,
                    ),
                ),
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun dependenciesOf(json: Map<*, *>): List<Map<String, Any>> {
        val variants = json["variants"] as List<Map<String, Any>>
        return variants.first()["dependencies"] as List<Map<String, Any>>
    }

    @Test
    fun `appends new dependencies with no pre-existing entries`() {
        val json = jsonWithVariant(mutableListOf())
        val toInject = VersionMediatingDependencySet()
        toInject.add(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false))

        mutateModuleJsonVariants(json, toInject) { _, _ -> false }

        val deps = dependenciesOf(json)
        assertEquals(1, deps.size)
        assertEquals("androidx.core", deps.first()["group"])
        assertEquals("core-ktx", deps.first()["module"])
    }

    @Test
    fun `a superseded stale entry is replaced by the mediated version, not left duplicated or missing`() {
        val json =
            jsonWithVariant(
                mutableListOf(
                    mutableMapOf("group" to "androidx.appcompat", "module" to "appcompat"),
                ),
            )
        val mediated = VersionMediatingDependencySet()
        mediated.add(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false))

        mutateModuleJsonVariants(json, mediated) { group, module ->
            group == "androidx.appcompat" && module == "appcompat"
        }

        val deps = dependenciesOf(json)
        assertEquals(1, deps.size, "expected exactly one entry, not zero (deleted) or two (duplicated)")
        @Suppress("UNCHECKED_CAST")
        val version = (deps.first()["version"] as? Map<String, Any>)?.get("requires")
        assertEquals("1.7.1", version)
    }
}
