plugins {
    alias(libs.plugins.kotlinJvm)
    `java-gradle-plugin`
}

group = property("GROUP").toString()
version = property("VERSION").toString()

gradlePlugin {
    plugins {
        create("rnbrownfieldGradlePlugin") {
            id = property("PROJECT_ID").toString()
            implementationClass = property("IMPLEMENTATION_CLASS").toString()
        }
    }
}

repositories {
    mavenCentral()
    google()
}
