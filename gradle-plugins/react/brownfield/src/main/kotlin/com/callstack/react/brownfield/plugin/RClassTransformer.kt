package com.callstack.react.brownfield.plugin

import com.android.build.api.instrumentation.AsmClassVisitorFactory
import com.android.build.api.instrumentation.ClassContext
import com.android.build.api.instrumentation.ClassData
import com.android.build.api.instrumentation.FramesComputationMode
import com.android.build.api.instrumentation.InstrumentationParameters
import com.android.build.api.instrumentation.InstrumentationScope
import com.android.build.api.variant.AndroidComponentsExtension
import com.callstack.react.brownfield.processors.VariantPackagesProperty
import com.callstack.react.brownfield.shared.BaseProject
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Optional
import org.objectweb.asm.ClassVisitor
import org.objectweb.asm.commons.ClassRemapper
import org.objectweb.asm.commons.Remapper
import java.util.Collections
import java.util.stream.Collectors

/**
 * Transforms R classes of all modules into a single
 * R class. This avoid duplicates issues as each module
 * can have it's own R class, so this redirects all
 * references to a single R class.
 */
object RClassTransformer : BaseProject() {
    fun registerASMTransformation() {
        val components = project.extensions.getByType(AndroidComponentsExtension::class.java)
        val variantPackagesProperty = VariantPackagesProperty.getVariantPackagesProperty()

        components.onVariants(components.selector().all()) { variant ->
            variant.instrumentation.transformClassesWith(
                RClassAsmTransformerFactory::class.java,
                InstrumentationScope.PROJECT,
            ) { params ->
                params.namespace.set(variant.namespace)
                params.libraryNamespaces.set(
                    variantPackagesProperty.getting(variant.name)
                        .map { list -> list.toList()},
                )
            }

            variant.instrumentation.setAsmFramesComputationMode(FramesComputationMode.COPY_FRAMES)
        }
    }

    /**
     * transforms R class into bytecode
     */
    abstract class RClassAsmTransformerFactory :
        AsmClassVisitorFactory<RClassAsmTransformerFactory.Params> {
        interface Params : InstrumentationParameters {
            @get:Input
            val namespace: Property<String>

            @get:Input
            @get:Optional
            val libraryNamespaces: ListProperty<String>
        }

        /**
         * Creates a class that remaps R class and its subclasses.
         */
        override fun createClassVisitor(
            classContext: ClassContext,
            nextClassVisitor: ClassVisitor,
        ): ClassVisitor {
            val params = parameters.get()
            val namespace = params.namespace.get()
            val libraryNamespaces = params.libraryNamespaces.orElse(Collections.emptyList()).get()

            if (libraryNamespaces.isEmpty()) {
                return nextClassVisitor
            }

            return ClassRemapper(nextClassVisitor, getRemapper(libraryNamespaces, namespace))
        }

        private fun getRemapper(
            libraryNamespaces: List<String>,
            namespace: String,
        ): Remapper {
            val formattedNameSpace = namespace.replace(".", "/")
            val targetRClass = "$formattedNameSpace/R"
            val targetRSubclass = "$formattedNameSpace/R$"

            val libraryRClasses = getLibraryRClasses(libraryNamespaces)
            val libraryRSubclasses = getLibraryRSubclasses(libraryNamespaces)

            val remapper =
                object : Remapper() {
                    override fun map(internalName: String?): String? {
                        if (internalName == null) {
                            return null
                        }
                        if (libraryRClasses.contains(internalName)) {
                            return targetRClass
                        }
                        for (libraryRSubclass in libraryRSubclasses) {
                            if (internalName.startsWith(libraryRSubclass)) {
                                return internalName.replaceFirst(libraryRSubclass, targetRSubclass, false)
                            }
                        }
                        return super.map(internalName)
                    }
                }
            return remapper
        }

        private fun getLibraryRClasses(libraryNamespaces: List<String>): Set<String> {
            return libraryNamespaces.stream()
                .map { it.replace(".", "/") + "/R" }
                .collect(Collectors.toSet())
        }

        private fun getLibraryRSubclasses(libraryNamespaces: List<String>): List<String> {
            return libraryNamespaces.stream()
                .map { it.replace(".", "/") + "/R$" }
                .collect(Collectors.toList())
        }

        /**
         * Determines if the class can be checked for transformation.
         */
        override fun isInstrumentable(classData: ClassData): Boolean {
            return true
        }
    }
}
