plugins {
    alias(libs.plugins.kotlinJvm)
    `java-gradle-plugin`
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
    `maven-publish`
    signing
    kotlin("plugin.serialization") version "1.9.24"
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

publishing {
    publications.withType<MavenPublication>().configureEach {
        artifactId = property("ARTIFACT_ID").toString()
    }

    publications {
        create<MavenPublication>("mavenLocal") {
            from(components["java"])

            groupId = property("GROUP").toString()
            artifactId = property("ARTIFACT_ID").toString()
            version = property("VERSION").toString()

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
            }
        }
    }

    repositories {
        mavenLocal()
    }
}

repositories {
    mavenCentral()
    google()
}

dependencies {
    implementation(libs.agp)
    implementation(libs.common)
    implementation(libs.asm.commons)
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
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
