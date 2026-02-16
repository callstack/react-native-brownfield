import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_VERSION = '0.6.3-SNAPSHOT';
const targetPath = path.resolve(__dirname, '..', 'android', 'build.gradle');

function ensureMavenLocalInBuildscriptRepositories(contents: string): string {
  const buildscriptReposRegex =
    /(buildscript\s*\{[\s\S]*?repositories\s*\{[\s\S]*?)(})/m;
  const reposMatch = contents.match(buildscriptReposRegex);

  if (!reposMatch) {
    throw new Error(
      'Could not locate buildscript.repositories block in android/build.gradle'
    );
  }

  if (reposMatch[1].includes('mavenLocal()')) {
    return contents;
  }

  return contents.replace(buildscriptReposRegex, `$1    mavenLocal()\n$2`);
}

function ensureSnapshotPluginDependency(contents: string): string {
  const pluginDependencyRegex =
    /classpath\((['"])com\.callstack\.react:brownfield-gradle-plugin:[^'"]+\1\)/;
  const snapshotDependency = `classpath("com.callstack.react:brownfield-gradle-plugin:${SNAPSHOT_VERSION}")`;

  if (pluginDependencyRegex.test(contents)) {
    return contents.replace(pluginDependencyRegex, snapshotDependency);
  }

  const buildscriptDepsRegex =
    /(buildscript\s*\{[\s\S]*?dependencies\s*\{[\s\S]*?)(})/m;
  const depsMatch = contents.match(buildscriptDepsRegex);

  if (!depsMatch) {
    throw new Error(
      'Could not locate buildscript.dependencies block in android/build.gradle'
    );
  }

  return contents.replace(buildscriptDepsRegex, `$1${snapshotDependency}\n$2`);
}

function run(): void {
  const originalContents = fs.readFileSync(targetPath, 'utf8');

  let updatedContents = originalContents;
  updatedContents = ensureMavenLocalInBuildscriptRepositories(updatedContents);
  updatedContents = ensureSnapshotPluginDependency(updatedContents);

  if (updatedContents === originalContents) {
    console.log('No changes needed for android/build.gradle');
    return;
  }

  fs.writeFileSync(targetPath, updatedContents, 'utf8');
  console.log('Patched android/build.gradle for CI snapshot plugin usage');
}

run();
