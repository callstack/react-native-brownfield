import groovy.json.JsonOutput
import groovy.json.JsonSlurper

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.callstack.react.brownfield")
    `maven-publish`
    id("com.facebook.react")
}

/**
* This function is used in the places where we:
*
* Remove the `expo` dependency from the `module.json` and `pom.xml file. Otherwise, the
* gradle will try to resolve this and will throw an error, since this dependency won't
* be available from a remote repository.
*
* Your AAR does not need this dependency.
*/
fun isExpoArtifact(group: String, artifactId: String): Boolean {
    return group == "host.exp.exponent" && artifactId == "expo"
}

publishing {
    publications {
        create<MavenPublication>("mavenAar") {
            groupId = "{{GROUP_ID}}"
            artifactId = "{{ARTIFACT_ID}}"
            version = "{{ARTIFACT_VERSION}}"
            afterEvaluate {
                from(components.getByName("default"))
            }

            pom {
                withXml {
                    /**
                     * As a result of `from(components.getByName("default")` all of the project
                     * dependencies are added to `pom.xml` file. We do not need the react-native
                     * third party dependencies to be a part of it as we embed those dependencies.
                     */
                    val dependenciesNode =
                        (asNode().get("dependencies") as groovy.util.NodeList).first() as groovy.util.Node
                    dependenciesNode.children()
                        .filterIsInstance<groovy.util.Node>()
                        .filter {
                            val artifactId = (it["artifactId"] as groovy.util.NodeList).text()
                            val group = (it["groupId"] as groovy.util.NodeList).text()

                            (isExpoArtifact(group, artifactId) || group == rootProject.name)
                        }
                        .forEach { dependenciesNode.remove(it) }
                }
            }
        }
    }

    repositories {
        mavenLocal() // Publishes to the local Maven repository (~/.m2/repository by default)
    }
}

val moduleBuildDir: Directory = layout.buildDirectory.get()

/**
 * As a result of `from(components.getByName("default")` all of the project
 * dependencies are added to `module.json` file. We do not need the react-native
 * third party dependencies to be a part of it as we embed those dependencies.
 */
tasks.register("removeDependenciesFromModuleFile") {
    doLast {
        file("$moduleBuildDir/publications/mavenAar/module.json").run {
            val json = inputStream().use { JsonSlurper().parse(it) as Map<String, Any> }
            (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll {
                    val module = it["module"] as String
                    val group = it["group"] as String

                    (isExpoArtifact(group, module) || group == rootProject.name)
                }
            }
            writer().use { it.write(JsonOutput.prettyPrint(JsonOutput.toJson(json))) }
        }
    }
}

tasks.named("generateMetadataFileForMavenAarPublication") {
    finalizedBy("removeDependenciesFromModuleFile")
}

reactBrownfield {
    isExpo = true
}

react {
    autolinkLibrariesWithApp()
}

android {
    namespace = "{{PACKAGE_NAME}}"
    compileSdk = {{COMPILE_SDK_VERSION}}

    defaultConfig {
        minSdk = {{MIN_SDK_VERSION}}

        buildConfigField(
            "boolean",
            "IS_EDGE_TO_EDGE_ENABLED",
            properties["edgeToEdgeEnabled"].toString()
        )
        buildConfigField(
            "boolean",
            "IS_NEW_ARCHITECTURE_ENABLED",
            properties["newArchEnabled"].toString()
        )
        buildConfigField("boolean", "IS_HERMES_ENABLED", properties["hermesEnabled"].toString())

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    publishing {
        multipleVariants {
            allVariants()
        }
    }
}

dependencies {
    api("com.facebook.react:react-android:{{RN_VERSION}}")
    api("com.facebook.react:hermes-android:{{RN_VERSION}}")
}
