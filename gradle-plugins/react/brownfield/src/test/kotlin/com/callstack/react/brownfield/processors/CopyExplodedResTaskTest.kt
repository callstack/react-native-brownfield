package com.callstack.react.brownfield.processors

import com.android.ide.common.rendering.api.ResourceNamespace
import com.android.ide.common.resources.ResourceSet
import com.android.utils.StdLogger
import org.gradle.api.Project
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.w3c.dom.Element
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Every exploded AAR keeps its values in `res/values/values.xml`, so libraries share that path.
 * See #490 (values lost) and #125 (duplicate resources failing the build).
 */
class CopyExplodedResTaskTest {
    @TempDir
    lateinit var tempDir: File

    @Test
    fun `keeps the values of every library`() {
        val bootsplash =
            libraryRes(
                "react-native-bootsplash",
                """<attr name="bootSplashBackground" format="color" />""",
            )
        val brownfield =
            libraryRes(
                "callstack_react-native-brownfield",
                """<string name="app_name">ReactNativeBrownfield</string>""",
            )

        val out = runCopy(bootsplash, brownfield)

        val names = valuesElements(out).map { it.key() }
        assertTrue("attr/bootSplashBackground" in names, "bootsplash values were dropped: $names")
        assertTrue("string/app_name" in names, "brownfield values were dropped: $names")
    }

    @Test
    fun `a name defined by two libraries ends up once`() {
        val video = libraryRes("react-native-video", """<color name="red">#FF0000</color>""")
        val messaging =
            libraryRes("react-native-firebase_messaging", """<color name="red">#E53935</color>""")

        val out = runCopy(video, messaging)

        val reds = valuesElements(out).filter { it.key() == "color/red" }
        assertEquals(1, reds.size, "duplicate resources would fail the build: ${reds.map { it.textContent }}")
        assertEquals("#FF0000", reds.single().textContent, "the first library should win, like in an app")
    }

    @Test
    fun `merges the attrs of a styleable defined by two libraries`() {
        val first =
            libraryRes(
                "lib-a",
                """<declare-styleable name="Shared"><attr name="aColor" format="color" /></declare-styleable>""",
            )
        val second =
            libraryRes(
                "lib-b",
                """<declare-styleable name="Shared"><attr name="bSize" format="dimension" /></declare-styleable>""",
            )

        val out = runCopy(first, second)

        val styleables = valuesElements(out).filter { it.key() == "declare-styleable/Shared" }
        assertEquals(1, styleables.size)
        // aapt2 sorts a styleable's attrs itself, so their order doesn't matter.
        val attrs = styleables.single().childElements().map { it.getAttribute("name") }
        assertEquals(setOf("aColor", "bSize"), attrs.toSet())
    }

    @Test
    fun `defines an attr once when another library declares it inside a styleable`() {
        val first = libraryRes("lib-a", """<attr name="tint" format="color" />""")
        // One library can't define it twice itself, its own build would fail.
        val second = libraryRes("lib-b", """<declare-styleable name="Badge"><attr name="tint" format="color" /></declare-styleable>""")
        val third = libraryRes("lib-c", """<declare-styleable name="Chip"><attr name="tint" format="color" /></declare-styleable>""")

        val out = runCopy(first, second, third)

        val elements = valuesElements(out)
        val definitions =
            elements.filter { it.key() == "attr/tint" } +
                elements.filter { it.tagName == "declare-styleable" }.flatMap { it.childElements() }
                    .filter { it.getAttribute("name") == "tint" && it.hasAttribute("format") }
        assertEquals(1, definitions.size, "attr/tint defined more than once would fail the build")
        val styleables = elements.filter { it.tagName == "declare-styleable" }.map { it.getAttribute("name") }
        assertEquals(listOf("Badge", "Chip"), styleables.sorted())
    }

    @Test
    fun `keeps an attr definition that only the second of two same-name styleables has`() {
        val first = libraryRes("lib-a", """<declare-styleable name="S"><attr name="x" /></declare-styleable>""")
        val second =
            libraryRes("lib-b", """<declare-styleable name="S"><attr name="x" format="color" /></declare-styleable>""")

        val out = runCopy(first, second)

        val elements = valuesElements(out)
        val definitions =
            (elements + elements.filter { it.tagName == "declare-styleable" }.flatMap { it.childElements() })
                .filter { it.tagName == "attr" && it.getAttribute("name") == "x" && it.hasAttribute("format") }
        assertEquals(listOf("color"), definitions.map { it.getAttribute("format") })
    }

    @Test
    fun `keeps one file when two libraries ship the same resource with different extensions`() {
        val first = libraryRes("lib-a", "")
        val second = libraryRes("lib-b", "")
        File(first, "drawable").mkdirs()
        File(first, "drawable/ic_close.png").writeBytes(byteArrayOf(1))
        File(second, "drawable").mkdirs()
        File(second, "drawable/ic_close.xml").writeText("<vector/>")

        val out = runCopy(first, second)

        assertEquals(listOf("ic_close.png"), File(out, "drawable").list().orEmpty().toList())
    }

    @Test
    fun `keeps namespace declarations of merged styleable attrs`() {
        val first = libraryRes("lib-a", """<declare-styleable name="Shared"><attr name="a" format="color" /></declare-styleable>""")
        val second = File(tempDir, "exploded-aar/lib-b/res")
        File(second, "values").mkdirs()
        File(second, "values/values.xml").writeText(
            """
            <?xml version="1.0" encoding="utf-8"?>
            <resources xmlns:tools="http://schemas.android.com/tools">
                <declare-styleable name="Shared"><attr name="b" format="color" tools:ignore="X" /></declare-styleable>
            </resources>
            """.trimIndent(),
        )

        val out = runCopy(first, second)

        val factory = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        File(out, "values").listFiles().orEmpty().forEach { factory.newDocumentBuilder().parse(it) }
    }

    @Test
    fun `lets the module's own resources win over a library's`() {
        val module = libraryRes("module", """<string name="app_name">MyBrownfieldModule</string>""")
        File(module, "drawable").mkdirs()
        File(module, "drawable/logo.png").writeBytes(byteArrayOf(1))
        val brownfield =
            libraryRes(
                "callstack_react-native-brownfield",
                """<string name="app_name">ReactNativeBrownfield</string><string name="other">x</string>""",
            )
        File(brownfield, "drawable").mkdirs()
        File(brownfield, "drawable/logo.xml").writeText("<vector/>")

        val out = runCopy(brownfield, moduleResDirs = listOf(module))

        assertEquals(listOf("string/other"), valuesElements(out).map { it.key() })
        assertTrue(!File(out, "drawable/logo.xml").exists(), "the library's drawable overrides the module's")
    }

    @Test
    fun `matches the module's qualifiers with the normalized ones of an AAR`() {
        val module = File(tempDir, "module/res")
        File(module, "values-night").mkdirs()
        File(module, "values-night/colors.xml").writeText(resources("""<color name="bg">#000000</color>"""))
        val lib = libraryRes("lib-a", "")
        File(lib, "values-night-v8").mkdirs()
        File(lib, "values-night-v8/values-night-v8.xml").writeText(resources("""<color name="bg">#FFFFFF</color>"""))

        val out = runCopy(lib, moduleResDirs = listOf(module))

        assertEquals(emptyList(), valuesElements(out, "values-night-v8").map { it.key() })
    }

    @Test
    fun `reads module values that declare entities in a DOCTYPE`() {
        val module = File(tempDir, "module/res")
        File(module, "values").mkdirs()
        File(module, "values/strings.xml").writeText(
            """
            <?xml version="1.0" encoding="utf-8"?>
            <!DOCTYPE resources [<!ENTITY product "Brownfield">]>
            <resources>
                <string name="app_name">&product;</string>
            </resources>
            """.trimIndent(),
        )
        val brownfield = libraryRes("brownfield", """<string name="app_name">ReactNativeBrownfield</string>""")

        val out = runCopy(brownfield, moduleResDirs = listOf(module))

        assertEquals(emptyList(), valuesElements(out).map { it.key() })
    }

    @Test
    fun `lets the module's resValues win over a library's`() {
        val brownfield = libraryRes("brownfield", """<string name="app_name">ReactNativeBrownfield</string>""")

        val out = runCopy(brownfield, moduleResValues = listOf("string/app_name"))

        assertEquals(emptyList(), valuesElements(out).map { it.key() })
    }

    @Test
    fun `keeps namespaced values from an AGP-written AAR`() {
        val lib = File(tempDir, "exploded-aar/lib-a/res")
        File(lib, "values").mkdirs()
        File(lib, "values/values.xml").writeText(
            """
            <?xml version="1.0" encoding="utf-8"?>
            <resources xmlns:ns1="urn:oasis:names:tc:xliff:document:1.2">
                <string name="greeting">Hi <ns1:g id="name">%s</ns1:g></string>
            </resources>
            """.trimIndent(),
        )

        val out = runCopy(lib)

        val factory = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        val file = File(out, "values").listFiles().orEmpty().single()
        val g = factory.newDocumentBuilder().parse(file).getElementsByTagNameNS("urn:oasis:names:tc:xliff:document:1.2", "g")
        assertEquals(1, g.length)
    }

    @Test
    fun `keeps the module's definition of an attr a library declares inside a styleable`() {
        val module = File(tempDir, "module/res")
        File(module, "values").mkdirs()
        File(module, "values/attrs.xml").writeText(resources("""<attr name="tint" format="color" />"""))
        val lib =
            libraryRes("lib-a", """<declare-styleable name="Badge"><attr name="tint" format="dimension" /></declare-styleable>""")

        val out = runCopy(lib, moduleResDirs = listOf(module))

        val attrs = valuesElements(out).filter { it.tagName == "declare-styleable" }.flatMap { it.childElements() }
        assertEquals(listOf(""), attrs.map { it.getAttribute("format") }, "the library would override the module's attr format")
    }

    @Test
    fun `keeps the first library's format of an attr two libraries declare in different styleables`() {
        listOf("A" to "B", "B" to "A", "Badge" to "Chip", "Chip" to "Badge").forEach { (firstStyleable, secondStyleable) ->
            tempDir.listFiles()?.forEach { it.deleteRecursively() }
            val first =
                libraryRes("lib-a", """<declare-styleable name="$firstStyleable"><attr name="x" format="color" /></declare-styleable>""")
            val second =
                libraryRes(
                    "lib-b",
                    """<declare-styleable name="$secondStyleable"><attr name="x" format="dimension" /></declare-styleable>""",
                )

            val out = runCopy(first, second)

            val elements = valuesElements(out)
            val formats =
                (elements + elements.filter { it.tagName == "declare-styleable" }.flatMap { it.childElements() })
                    .filter { it.tagName == "attr" && it.getAttribute("name") == "x" && it.hasAttribute("format") }
                    .map { it.getAttribute("format") }
            assertEquals(listOf("color"), formats, "styleables $firstStyleable and $secondStyleable")
        }
    }

    @Test
    fun `keeps the same name in different qualifiers`() {
        val lib = libraryRes("lib-a", """<color name="bg">#000000</color>""")
        File(lib, "values-night").mkdirs()
        File(lib, "values-night/values-night.xml").writeText(resources("""<color name="bg">#FFFFFF</color>"""))

        val out = runCopy(lib)

        assertEquals(listOf("#000000"), valuesElements(out, "values").map { it.textContent })
        // Written with the implied version qualifier, as in an AAR.
        assertEquals(listOf("#FFFFFF"), valuesElements(out, "values-night-v8").map { it.textContent })
    }

    @Test
    fun `keeps the first library's file for other resource types`() {
        val first = libraryRes("lib-a", "")
        val second = libraryRes("lib-b", "")
        listOf(first to "a", second to "b").forEach { (resDir, marker) ->
            File(resDir, "drawable").mkdirs()
            File(resDir, "drawable/icon.xml").writeText("<shape xmlns:android=\"x\" android:tag=\"$marker\"/>")
        }

        val out = runCopy(first, second)

        assertTrue(File(out, "drawable/icon.xml").readText().contains("\"a\""))
    }

    private fun libraryRes(
        libraryName: String,
        valuesBody: String,
    ): File {
        val resDir = File(tempDir, "exploded-aar/$libraryName/res")
        File(resDir, "values").mkdirs()
        File(resDir, "values/values.xml").writeText(resources(valuesBody))
        return resDir
    }

    private fun resources(body: String) =
        """
        <?xml version="1.0" encoding="utf-8"?>
        <resources>
            $body
        </resources>
        """.trimIndent()

    private fun runCopy(
        vararg resDirs: File,
        moduleResDirs: List<File> = emptyList(),
        moduleResValues: List<String> = emptyList(),
    ): File {
        val project: Project = ProjectBuilder.builder().withProjectDir(File(tempDir, "project")).build()
        val out = File(tempDir, "out")
        val task = project.tasks.register("copyExplodedResForTest", CopyExplodedResTask::class.java).get()
        task.inputResDirs.setFrom(resDirs.toList())
        task.moduleResDirs.setFrom(moduleResDirs)
        task.moduleResValues.set(moduleResValues)
        task.outputDirectory.set(out)

        task.run()

        // AGP loads the generated dir as one resource set, which fails on any duplicate (#125).
        ResourceSet("generated", ResourceNamespace.RES_AUTO, null, true, null).apply {
            addSource(out)
            loadFromFiles(StdLogger(StdLogger.Level.WARNING))
        }
        return out
    }

    /** Top-level resources of every file in one qualifier directory, one entry per definition. */
    private fun valuesElements(
        resDir: File,
        qualifierDir: String = "values",
    ): List<Element> {
        val files = File(resDir, qualifierDir).listFiles { f -> f.extension == "xml" }.orEmpty()
        return files.flatMap { file ->
            DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.childElements()
        }
    }

    private fun Element.key() = "$tagName/${getAttribute("name")}"

    private fun Element.childElements(): List<Element> {
        val children = childNodes
        return (0 until children.length).map { children.item(it) }.filterIsInstance<Element>()
    }
}
