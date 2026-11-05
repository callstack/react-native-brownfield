package com.callstack.react.brownfield.processors

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class JniLibsPlanTest {
    @TempDir
    lateinit var tempDir: File

    private val appDir by lazy { File(tempDir, "app") }

    private fun aarDir(name: String) = File(tempDir, "aar-$name")

    private fun so(
        root: File,
        abi: String,
        name: String,
        content: String = name,
    ): File =
        File(root, "$abi/$name").apply {
            parentFile.mkdirs()
            writeText(content)
        }

    private fun plan(
        aars: List<File> = emptyList(),
        app: File? = appDir,
        ignored: List<String> = IGNORE_EMBEDDED_LIBS,
        dynamic: List<String> = emptyList(),
    ) = planJniLibs(aars, app, ignored, dynamic)

    @Test
    fun `copies app-owned libs from the app dir`() {
        val appModules = so(appDir, "arm64-v8a", "libappmodules.so")
        val codegen = so(appDir, "arm64-v8a", "libreact_codegen_rnscreens.so")

        val plan = plan()

        assertEquals(appModules, plan.copies["arm64-v8a/libappmodules.so"])
        assertEquals(codegen, plan.copies["arm64-v8a/libreact_codegen_rnscreens.so"])
    }

    @Test
    fun `skips app dir libs that no embedded AAR ships`() {
        for (abi in listOf("arm64-v8a", "x86_64")) {
            so(appDir, abi, "libQmBlur.so")
            so(appDir, abi, "libandroidx.graphics.path.so")
        }

        val plan = plan()

        assertTrue(plan.copies.isEmpty(), "Maven-only libs must stay out of the AAR: ${plan.copies.keys}")
    }

    @Test
    fun `falls back to the embedded AAR copy when the app dir lacks it`() {
        val aar = aarDir("a")
        val fromAar = so(aar, "arm64-v8a", "libfoo.so")
        so(appDir, "arm64-v8a", "libappmodules.so")

        val plan = plan(aars = listOf(aar))

        assertEquals(fromAar, plan.copies["arm64-v8a/libfoo.so"])
    }

    @Test
    fun `drops ignored libs`() {
        val aar = aarDir("a")
        so(aar, "arm64-v8a", "libreactnative.so")
        so(aar, "arm64-v8a", "libc++_shared.so")
        so(aar, "arm64-v8a", "libdatadog-ndk.so")
        so(appDir, "arm64-v8a", "libmmkv.so")

        val plan =
            plan(
                aars = listOf(aar),
                ignored = IGNORE_EMBEDDED_LIBS + "libdatadog" + "mmkv",
                dynamic = listOf("libmmkv.so"),
            )

        assertTrue(plan.copies.isEmpty(), "ignored libs were embedded: ${plan.copies.keys}")
    }

    @Test
    fun `keeps app-owned libs even if an ignore entry matches`() {
        so(appDir, "arm64-v8a", "libappmodules.so")

        val plan = plan(ignored = listOf("libappmodules"))

        assertTrue("arm64-v8a/libappmodules.so" in plan.copies)
    }

    @Test
    fun `includes dynamicLibs from the app dir`() {
        val mmkv = so(appDir, "arm64-v8a", "libmmkv.so")

        val plan = plan(dynamic = listOf("libmmkv.so"))

        assertEquals(mmkv, plan.copies["arm64-v8a/libmmkv.so"])
        assertTrue(plan.unmatchedDynamicLibs.isEmpty())
    }

    @Test
    fun `prefers the app dir copy of a duplicate name`() {
        val a = aarDir("a")
        val b = aarDir("b")
        so(a, "arm64-v8a", "libworklets.so", "a")
        so(b, "arm64-v8a", "libworklets.so", "b")
        val fromApp = so(appDir, "arm64-v8a", "libworklets.so", "app")

        val plan = plan(aars = listOf(a, b))

        assertEquals(listOf("arm64-v8a/libworklets.so"), plan.copies.keys.toList())
        assertEquals(fromApp, plan.copies["arm64-v8a/libworklets.so"])
    }

    @Test
    fun `keeps the first AAR copy of a duplicate name`() {
        val a = aarDir("a")
        val b = aarDir("b")
        val first = so(a, "arm64-v8a", "libdup.so", "a")
        so(b, "arm64-v8a", "libdup.so", "b")

        val plan = plan(aars = listOf(a, b), app = null)

        assertEquals(first, plan.copies["arm64-v8a/libdup.so"])
    }

    @Test
    fun `records why each lib was skipped`() {
        val aar = aarDir("a")
        so(appDir, "arm64-v8a", "libQmBlur.so")
        so(aar, "arm64-v8a", "libreactnative.so")

        val plan = plan(aars = listOf(aar))

        assertEquals(
            mapOf("libQmBlur.so" to SkipReason.NOT_EMBEDDED, "libreactnative.so" to SkipReason.IGNORED),
            plan.skipped,
        )
    }

    @Test
    fun `summary lists only libs no embedded library ships`() {
        val aar = aarDir("a")
        so(appDir, "arm64-v8a", "libQmBlur.so")
        so(appDir, "arm64-v8a", "libandroidx.graphics.path.so")
        so(aar, "arm64-v8a", "libreactnative.so")

        val summary = skippedSummary(plan(aars = listOf(aar)), File("/r/skipped-so.txt"))!!

        assertTrue(summary.startsWith("Brownfield: left 2 .so file(s) out of the AAR"), summary)
        assertTrue("libQmBlur.so, libandroidx.graphics.path.so" in summary, summary)
        assertTrue("your app module builds or ships it" in summary, summary)
        assertTrue("reactBrownfield.dynamicLibs" in summary, summary)
        assertTrue("Details: /r/skipped-so.txt" in summary, summary)
        assertFalse("libreactnative.so" in summary, summary)
    }

    @Test
    fun `no summary when nothing is skipped as not embedded`() {
        val aar = aarDir("a")
        so(appDir, "arm64-v8a", "libappmodules.so")
        so(aar, "arm64-v8a", "libreactnative.so")

        assertNull(skippedSummary(plan(aars = listOf(aar)), null))
    }

    @Test
    fun `reports dynamicLibs entries that match nothing`() {
        val plan = plan(dynamic = listOf("libnope.so", "libmmkv*.so"))

        assertEquals(setOf("libnope.so", "libmmkv*.so"), plan.unmatchedDynamicLibs)
    }

    @Test
    fun `only uses the ABIs the app module built`() {
        val aar = aarDir("a")
        so(appDir, "arm64-v8a", "libappmodules.so")
        so(aar, "arm64-v8a", "libfoo.so")
        so(aar, "x86_64", "libfoo.so")

        val plan = plan(aars = listOf(aar))

        assertEquals(setOf("arm64-v8a/libappmodules.so", "arm64-v8a/libfoo.so"), plan.copies.keys)
        assertEquals(setOf("x86_64"), plan.excludedAbis)
    }

    @Test
    fun `uses every ABI the AARs ship when the app module built none`() {
        val aar = aarDir("a")
        so(aar, "x86_64", "libfoo.so")

        val plan = plan(aars = listOf(aar), app = null)

        assertEquals(setOf("x86_64/libfoo.so"), plan.copies.keys)
        assertTrue(plan.excludedAbis.isEmpty())
    }

    @Test
    fun `warns about dynamicLibs entries that an ignore entry drops`() {
        so(appDir, "arm64-v8a", "libmmkv.so")

        val plan = plan(ignored = listOf("mmkv"), dynamic = listOf("libmmkv.so"))

        assertEquals(setOf("libmmkv.so"), plan.ignoredDynamicLibs)
        assertTrue(plan.unmatchedDynamicLibs.isEmpty())
        val warning = planWarnings(plan).single()
        assertTrue("libmmkv.so" in warning && "ignoreEmbeddedLibs" in warning, warning)
    }

    @Test
    fun `warns about dynamicLibs entries that match nothing`() {
        val warning = planWarnings(plan(dynamic = listOf("libnope.so"))).single()

        assertTrue("'libnope.so' matches no .so file" in warning, warning)
    }

    @Test
    fun `no warnings for a clean plan`() {
        so(appDir, "arm64-v8a", "libappmodules.so")

        assertTrue(planWarnings(plan()).isEmpty())
    }

    @Test
    fun `stripped mode reads the app's stripped output`() {
        assertEquals(
            AppNativeLibsSource(
                "intermediates/stripped_native_libs/devRelease/stripDevReleaseDebugSymbols/out/lib",
                "stripDevReleaseDebugSymbols",
            ),
            appNativeLibsSource("devRelease", true),
        )
    }

    @Test
    fun `unstripped mode reads the app's merged output`() {
        assertEquals(
            AppNativeLibsSource(
                "intermediates/merged_native_libs/devRelease/mergeDevReleaseNativeLibs/out/lib",
                "mergeDevReleaseNativeLibs",
            ),
            appNativeLibsSource("devRelease", false),
        )
    }
}
