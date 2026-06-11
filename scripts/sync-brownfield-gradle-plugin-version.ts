import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SyncOptions {
  repoRoot?: string;
  check?: boolean;
}

export interface SyncResult {
  version: string;
  snapshotVersion: string;
  changedFiles: string[];
  inSync: boolean;
}

interface Versions {
  version: string;
  snapshotVersion: string;
}

type Transformer = (contents: string, versions: Versions) => string;

interface SyncTarget {
  relativePath: string;
  transform: Transformer;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..');

const VERSION_SOURCE_PATH = 'gradle-plugins/react/brownfield/gradle.properties';

const SYNC_TARGETS: SyncTarget[] = [
  {
    relativePath:
      'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts',
    transform: (contents, versions) =>
      replaceRequired(
        contents,
        /export const BROWNFIELD_PLUGIN_VERSION = '[^']+';/,
        `export const BROWNFIELD_PLUGIN_VERSION = '${versions.version}';`,
        'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts'
      ),
  },
  {
    relativePath: 'apps/scripts/prepare-android-build-gradle-for-ci.ts',
    transform: (contents, versions) =>
      replaceRequired(
        contents,
        /const SNAPSHOT_VERSION = '[^']+';/,
        `const SNAPSHOT_VERSION = '${versions.snapshotVersion}';`,
        'apps/scripts/prepare-android-build-gradle-for-ci.ts'
      ),
  },
  {
    relativePath: 'apps/RNApp/android/build.gradle',
    transform: (contents, versions) =>
      replaceRequired(
        contents,
        /classpath\("com\.callstack\.react:brownfield-gradle-plugin:[^")]+-SNAPSHOT"\)/,
        `classpath("com.callstack.react:brownfield-gradle-plugin:${versions.snapshotVersion}")`,
        'apps/RNApp/android/build.gradle'
      ),
  },
];

function replaceRequired(
  contents: string,
  pattern: RegExp,
  replacement: string,
  relativePath: string
): string {
  if (!pattern.test(contents)) {
    throw new Error(
      `Could not locate expected Brownfield Gradle Plugin version pattern in ${relativePath}`
    );
  }

  return contents.replace(pattern, replacement);
}

function readVersions(repoRoot: string): Versions {
  const propertiesPath = path.join(repoRoot, VERSION_SOURCE_PATH);
  const properties = fs.readFileSync(propertiesPath, 'utf8');
  const versionMatch = properties.match(/^VERSION=(.+)$/m);

  if (!versionMatch) {
    throw new Error(`Could not locate VERSION in ${VERSION_SOURCE_PATH}`);
  }

  const version = versionMatch[1].trim();
  return {
    version,
    snapshotVersion: `${version}-SNAPSHOT`,
  };
}

export function syncBrownfieldGradlePluginVersion(
  options: SyncOptions = {}
): SyncResult {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const versions = readVersions(repoRoot);
  const changedFiles: string[] = [];

  for (const target of SYNC_TARGETS) {
    const targetPath = path.join(repoRoot, target.relativePath);
    const originalContents = fs.readFileSync(targetPath, 'utf8');
    const updatedContents = target.transform(originalContents, versions);

    if (updatedContents !== originalContents) {
      changedFiles.push(target.relativePath);

      if (!options.check) {
        fs.writeFileSync(targetPath, updatedContents, 'utf8');
      }
    }
  }

  return {
    ...versions,
    changedFiles,
    inSync: changedFiles.length === 0,
  };
}

function parseArgs(argv: string[]): SyncOptions {
  return {
    check: argv.includes('--check'),
  };
}

function report(result: SyncResult, checkMode: boolean): void {
  if (result.inSync) {
    console.log('Brownfield Gradle Plugin versions already in sync');
    return;
  }

  for (const changedFile of result.changedFiles) {
    console.log(`${checkMode ? 'out of sync' : 'synced'} ${changedFile}`);
  }

  console.log(
    checkMode
      ? 'Brownfield Gradle Plugin version drift detected'
      : 'Brownfield Gradle Plugin version sync complete'
  );
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = syncBrownfieldGradlePluginVersion(options);
  report(result, options.check === true);

  if (options.check && !result.inSync) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === __filename) {
  main();
}
