/**
 * Helper functions for modifying Gradle files
 */

import { log } from '../logging';
import type { ResolvedBrownfieldPluginAndroidConfig } from '../types';

const BROWNFIELD_PLUGIN_VERSION = '0.6.3';

/**
 * Modifies the root build.gradle to add the brownfield Gradle plugin dependency
 */
export function modifyRootBuildGradle(contents: string): string {
  const pluginDependency = `classpath("com.callstack.react:brownfield-gradle-plugin:${BROWNFIELD_PLUGIN_VERSION}")`;

  // Check if already added
  if (contents.includes('brownfield-gradle-plugin')) {
    log('Brownfield Gradle plugin already in root build.gradle, skipping');
    return contents;
  }

  // Find the buildscript dependencies block
  const buildscriptDepsRegex =
    /(buildscript\s*\{[\s\S]*?dependencies\s*\{[\s\S]*?)(})/m;
  const match = contents.match(buildscriptDepsRegex);

  if (match) {
    // Insert before the closing brace of dependencies
    const insertion = `        ${pluginDependency} // Added by @callstack/react-native-brownfield\n    `;
    const modifiedContents = contents.replace(
      buildscriptDepsRegex,
      `$1${insertion}$2`
    );

    log('Added brownfield Gradle plugin to root build.gradle');
    return modifiedContents;
  }

  // Fallback: Add buildscript block if not present
  const buildscriptBlock = `
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        ${pluginDependency} // Added by @callstack/react-native-brownfield
    }
}

`;

  log('Added buildscript block with brownfield plugin to root build.gradle');
  return buildscriptBlock + contents;
}

/**
 * Modifies settings.gradle to include the brownfield module
 */
export function modifySettingsGradle(
  contents: string,
  moduleName: string
): string {
  const includeStatement = `include ':${moduleName}'`;

  // Check if already included
  if (contents.includes(includeStatement)) {
    log(`Module "${moduleName}" already in settings.gradle, skipping`);
    return contents;
  }

  // Add the include statement at the end
  const modifiedContents =
    contents +
    `\n// Brownfield module for AAR packaging - added by @callstack/react-native-brownfield\n${includeStatement}\n`;

  log(`Added module "${moduleName}" to settings.gradle`);
  return modifiedContents;
}

/**
 * Generates the build.gradle.kts content for the brownfield module
 */
export function getModuleBuildGradle(
  options: ResolvedBrownfieldPluginAndroidConfig
): string {
  const {
    packageName,
    minSdkVersion,
    compileSdkVersion,
    groupId,
    artifactId,
    version,
  } = options;

  return `import groovy.json.JsonOutput
import groovy.json.JsonSlurper

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
    id("com.callstack.react.brownfield")
    \`maven-publish\`
}

android {
    namespace = "${packageName}"
    compileSdk = ${compileSdkVersion}

    defaultConfig {
        minSdk = ${minSdkVersion}

        buildConfigField("boolean", "IS_EDGE_TO_EDGE_ENABLED", properties["edgeToEdgeEnabled"].toString())
        buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", properties["newArchEnabled"].toString())
        buildConfigField("boolean", "IS_HERMES_ENABLED", properties["hermesEnabled"].toString())
    }

    buildFeatures {
        buildConfig = true
    }

    publishing {
        multipleVariants {
            allVariants()
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

reactBrownfield {
    /**
     * This is available from com.callstack.react.brownfield version > 0.3.0
     * It takes care of linking expo dependencies like expo-image with your AAR module.
     */
    isExpo = true
}

react {
    autolinkLibrariesWithApp()
}

/**
 * This function is used to filter out the expo artifact from the dependencies.
 * Remove the expo dependency from the module.json and pom.xml file. Otherwise, the
 * gradle will try to resolve this and will throw an error, since this dependency won't
 * be available from a remote repository.
 */
fun isExpoArtifact(group: String, artifactId: String): Boolean {
    return group == "host.exp.exponent" && artifactId == "expo"
}

publishing {
    publications {
        create<MavenPublication>("mavenAar") {
            groupId = "${groupId}"
            artifactId = "${artifactId}"
            version = "${version}"
            afterEvaluate {
                from(components.getByName("default"))
            }

            pom {
                withXml {
                    /**
                     * As a result of \`from(components.getByName("default")\` all of the project
                     * dependencies are added to \`pom.xml\` file. We do not need the react-native
                     * third party dependencies to be a part of it as we embed those dependencies.
                     */
                    val dependenciesNode = (asNode().get("dependencies") as groovy.util.NodeList).first() as groovy.util.Node
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
 * As a result of \`from(components.getByName("default")\` all of the project
 * dependencies are added to \`module.json\` file. We do not need the react-native
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

dependencies {
  api("com.facebook.react:react-android")
  api("com.facebook.react:hermes-android")
}
`;
}

/**
 * Returns the gradle.properties content for the brownfield module
 */
export function getModuleGradleProperties(): string {
  return `# Project-wide Gradle settings for brownfield module
# These settings are inherited from the root project

# Enable New Architecture
newArchEnabled=true

# Enable Hermes
hermesEnabled=true

# Enable Edge-to-Edge
edgeToEdgeEnabled=false

# Android settings
android.useAndroidX=true
android.enableJetifier=true
`;
}

/**
 * Returns the AndroidManifest.xml content for the brownfield module
 */
export function getModuleAndroidManifest(packageName: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <!-- This is an Android Library module for brownfield integration -->
    <!-- No activities or services are declared here -->
    <!-- The consuming app will use ReactNativeFragment or ReactNativeBrownfield.createView() -->

</manifest>
`;
}
