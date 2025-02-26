plugins {
    alias(libs.plugins.kotlinJvm)
    `java-gradle-plugin`
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
    `maven-publish`
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
}

repositories {
    mavenCentral()
    google()
}

dependencies {
    implementation(libs.agp)
    implementation(libs.common)
    implementation(libs.asm.commons)
}

tasks.named("detekt").configure {
    dependsOn(":ktlintFormat")
}

tasks.register("lint") {
    dependsOn(":ktlintFormat")
}
