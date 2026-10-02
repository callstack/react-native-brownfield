export const BROWNFIELD_PLUGIN_VERSION = '2.0.0-alpha10';

/**
 * Newest brownfield-gradle-plugin version actually published to Maven Central
 * (verified against repo1.maven.org maven-metadata.xml). The version above is
 * kept in sync with gradle-plugins/react/brownfield/gradle.properties
 * (`yarn brownfield:plugin:version:sync`) and tracks the plugin under
 * development, whose release may lag behind this package. The RN CLI scaffold
 * emits this published pin instead, because a scaffolded app resolves the
 * classpath from Maven Central only and an unreleased version would 404.
 * Proven against a real RN 0.87.1 app: `:brownfieldlib:assembleDebug` with a
 * fresh Maven Central resolution of 2.0.0-alpha09.
 * TODO(release): once 2.0.0-alpha10 (or later) is on Maven Central, point this
 * at it — or better, make it track BROWNFIELD_PLUGIN_VERSION again.
 */
export const PUBLISHED_BROWNFIELD_PLUGIN_VERSION = '2.0.0-alpha09';

export function brownfieldGradlePluginClasspath(
  version: string = BROWNFIELD_PLUGIN_VERSION
): string {
  return `classpath("com.callstack.react:brownfield-gradle-plugin:${version}")`;
}

export const brownfieldGradlePluginDependency =
  brownfieldGradlePluginClasspath();
