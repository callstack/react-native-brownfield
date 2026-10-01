plugins {
    alias(libs.plugins.kotlinJvm)
    `java-gradle-plugin`
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
    `maven-publish`
    signing
}

ktlint {
    debug.set(false)
    verbose.set(true)
    android.set(false)
    outputToConsole.set(true)
    ignoreFailures.set(false)
    enableExperimentalRules.set(true)

    filter {
        exclude("**/generated/**")
        include("**/kotlin/**")
    }
}

detekt {
    toolVersion = libs.versions.detekt.get()
    config.setFrom(file("config/detekt/detekt.yml"))
    buildUponDefaultConfig = true
}

group = property("GROUP").toString()
version = property("VERSION").toString()

gradlePlugin {
    plugins {
        create("reactBrownfieldGradlePlugin") {
            id = property("PROJECT_ID").toString()
            implementationClass = property("IMPLEMENTATION_CLASS").toString()
        }
    }
}

val baseVersion = property("VERSION").toString()
val isSnapshot = project.findProperty("IS_SNAPSHOT") == "true"
val releaseStagingRepositoryDir = layout.buildDirectory.dir("staging-deploy")

version = if (isSnapshot) "$baseVersion-SNAPSHOT" else baseVersion

publishing {
    publications {
        create<MavenPublication>("mavenLocal") {
            from(components["java"])

            groupId = property("GROUP").toString()
            artifactId = property("ARTIFACT_ID").toString()
            version = version

            pom {
                name.set(property("DISPLAY_NAME").toString())
                description.set(property("DESCRIPTION").toString())
                url.set(property("GITHUB_URL").toString())

                licenses {
                    license {
                        name.set("The MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                        distribution.set("repo")
                    }
                }

                developers {
                    developer {
                        id.set("callstack")
                        name.set("Callstack Team")
                        email.set("it-admin@callstack.com")
                    }
                }
                scm {
                    connection.set(property("SCM_CONNECTION").toString())
                    developerConnection.set(property("SCM_DEV_CONNECTION").toString())
                    url.set(property("GITHUB_URL").toString())
                }
            }
        }
    }

    repositories {
        mavenLocal()
        maven {
            name = "releaseStaging"
            url = uri(releaseStagingRepositoryDir)
        }
    }
}

val skipSigning: Boolean = project.findProperty("SkipSigning") == "true"
signing {
    isRequired = !project.hasProperty("SkipSigning")
    sign(publishing.publications["mavenLocal"])
}

repositories {
    mavenCentral()
    google()
}

// AGP for GradleRunner.withPluginClasspath(), which only sees runtime dependencies, so TestKit
// projects can still apply com.android.library
val testKitPluginClasspath: Configuration by configurations.creating

dependencies {
    // AGP is provided by the consuming build's buildscript classpath. Keeping it
    // compileOnly stops the published module from pinning AGP (and therefore the
    // minimum Gradle version) for every app that applies this plugin.
    compileOnly(libs.agp)
    compileOnly(libs.common)
    implementation(libs.asm.commons)
    implementation(libs.versioncompare)
    testImplementation(libs.agp)
    testImplementation(libs.common)
    testImplementation(libs.junit.jupiter)
    testImplementation(gradleTestKit())
    testImplementation(kotlin("test"))
    testKitPluginClasspath(libs.agp)
}

tasks.pluginUnderTestMetadata {
    pluginClasspath.from(testKitPluginClasspath)
}

/**
 * AGP versions the plugin is tested against, oldest first.
 *
 * The first entry is the floor, and it is the same number as `agp` in `gradle/libs.versions.toml`
 * (what the plugin compiles against) and `RNBrownfieldPlugin.MIN_AGP` (what the apply-time gate
 * enforces). The compiler covers "we accidentally used an API newer than the floor"; this matrix
 * covers the other direction — "we used something a newer AGP has since removed or changed".
 */
val agpMatrix = listOf(libs.versions.agp.get(), "9.2.1")

/**
 * An AGP below the matrix floor. Not supported, and not built against — it exists only so a test can
 * prove `RNBrownfieldPlugin.MIN_AGP` actually rejects it instead of letting the consumer fail later
 * with an unattributable `NoSuchMethodError`.
 */
val belowFloorAgp = "8.9.0"

// A TestKit-ready AGP classpath per version above, keyed by version.
val agpClasspaths =
    (agpMatrix + belowFloorAgp).associateWith { agpVersion ->
        val suffix = agpVersion.replace('.', '_')
        val scope = configurations.dependencyScope("testkitAgp$suffix")
        dependencies.add(scope.name, "com.android.tools.build:gradle:$agpVersion")
        configurations.resolvable("testkitAgp${suffix}Classpath") {
            extendsFrom(scope.get())
        }
    }

// `withPluginClasspath()` builds the TestKit fixture classpath from the plugin's runtime
// classpath, which no longer carries AGP now that it is compileOnly. The fixtures apply
// `com.android.library`, so hand the floor AGP back to them here — test-only, so nothing
// reaches the published module.
tasks.named<PluginUnderTestMetadata>("pluginUnderTestMetadata") {
    pluginClasspath.from(agpClasspaths.getValue(agpMatrix.first()))
}

tasks.test {
    useJUnitPlatform()

    // Tests that want a specific AGP build their own TestKit classpath from these, via
    // `withPluginClasspath(files)` instead of the no-arg `withPluginClasspath()`.
    val mainSourceSet = sourceSets.main.get()
    systemProperty("agp.matrix.versions", agpMatrix.joinToString(","))
    systemProperty("agp.belowFloor.version", belowFloorAgp)
    agpClasspaths.forEach { (agpVersion, agpClasspath) ->
        val pluginClasspath = files(mainSourceSet.output, mainSourceSet.runtimeClasspath, agpClasspath)
        inputs.files(pluginClasspath).withPropertyName("agpMatrix-$agpVersion").withNormalizer(ClasspathNormalizer::class)
        jvmArgumentProviders.add(
            CommandLineArgumentProvider {
                listOf("-Dagp.classpath.$agpVersion=${pluginClasspath.joinToString(File.pathSeparator)}")
            },
        )
    }
}

tasks.named("detekt").configure {
    dependsOn(":ktlintFormat")
}

tasks.register("lint") {
    dependsOn(":ktlintFormat")
}

java {
    withJavadocJar()
    withSourcesJar()
}

tasks.javadoc {
    if (JavaVersion.current().isJava9Compatible) {
        (options as StandardJavadocDocletOptions).addBooleanOption("html5", true)
    }
    options {
        encoding = "UTF-8"
        source = "8"
    }
}
