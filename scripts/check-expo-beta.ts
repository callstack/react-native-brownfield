import fs from 'node:fs';
import path from 'node:path';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  expoVersion?: string;
  testedVersion?: string;
  apply?: boolean;
  githubOutput?: string;
  githubStepSummary?: string;
}

export interface ExpoPackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  brownie?: {
    kotlin?: string;
    kotlinPackageName?: string;
  };
  scripts?: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXPO_BETA_APP_DIR = path.join(REPO_ROOT, 'apps', 'ExpoAppBeta');
const EXPO_BETA_PACKAGE_JSON_PATH = path.join(EXPO_BETA_APP_DIR, 'package.json');
const EXPO_BETA_APP_JSON_PATH = path.join(EXPO_BETA_APP_DIR, 'app.json');
const EXPO_NPM_REGISTRY_URL = 'https://registry.npmjs.org/expo';

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--expo-version') {
      options.expoVersion = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--tested-version') {
      options.testedVersion = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--github-output') {
      options.githubOutput = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--github-step-summary') {
      options.githubStepSummary = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

export async function fetchLatestExpoCanaryVersion(): Promise<string | null> {
  const response = await fetch(EXPO_NPM_REGISTRY_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Expo metadata: ${response.status}`);
  }

  const data = (await response.json()) as {
    'dist-tags'?: Record<string, string>;
    versions?: Record<string, unknown>;
  };

  const canaryTag = data['dist-tags']?.canary;
  if (canaryTag) {
    return canaryTag;
  }

  const versions = Object.keys(data.versions ?? {})
    .filter((version) => version.includes('canary'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  return versions.at(-1) ?? null;
}

function updateFileContents(filePath: string, updater: (contents: string) => string): void {
  const contents = readFileSync(filePath, 'utf8');
  writeFileSync(filePath, updater(contents), 'utf8');
}

function getExpoTemplateAppDir(): string {
  const appsDir = path.join(REPO_ROOT, 'apps');
  const expoAppCandidates = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^ExpoApp\d+$/.test(entry.name))
    .map((entry) => ({
      path: path.join(appsDir, entry.name),
      version: Number(entry.name.replace('ExpoApp', '')),
    }))
    .sort((left, right) => right.version - left.version);

  const latestCandidate = expoAppCandidates[0];
  if (!latestCandidate) {
    throw new Error('Could not find an Expo template app directory');
  }

  return latestCandidate.path;
}

function replaceTemplateAppReferences(contents: string): string {
  return contents
    .replaceAll('@callstack/brownfield-example-expo-app-56', '@callstack/brownfield-example-expo-app-beta')
    .replaceAll('@callstack/brownfield-example-expo-app-55', '@callstack/brownfield-example-expo-app-beta')
    .replaceAll('"@callstack/brownfield-navigation": "workspace:^"', '"@callstack/brownfield-navigation": "file:../../packages/brownfield-navigation"')
    .replaceAll('"@callstack/brownie": "workspace:^"', '"@callstack/brownie": "file:../../packages/brownie"')
    .replaceAll('"@callstack/react-native-brownfield": "workspace:^"', '"@callstack/react-native-brownfield": "file:../../packages/react-native-brownfield"')
    .replaceAll('"@callstack/brownfield-example-shared-tests": "workspace:^"', '"@callstack/brownfield-example-shared-tests": "file:../brownfield-example-shared-tests"')
    .replaceAll('com.callstack.rnbrownfield.demo.expoapp56', 'com.callstack.rnbrownfield.demo.expobeta')
    .replaceAll('com.callstack.rnbrownfield.demo.expoapp55', 'com.callstack.rnbrownfield.demo.expobeta')
    .replaceAll('./android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expoapp56/Generated/', './android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expobeta/Generated/')
    .replaceAll('./android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expoapp55/Generated/', './android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expobeta/Generated/')
    .replaceAll('ExpoApp56', 'ExpoAppBeta')
    .replaceAll('ExpoApp55', 'ExpoAppBeta')
    .replaceAll('expoapp56', 'expoappbeta')
    .replaceAll('expoapp55', 'expoappbeta')
    .replaceAll('expoappbeta56', 'expoappbeta')
    .replaceAll('expoappbeta55', 'expoappbeta');
}

function generateExpoBetaApp(): void {
  rmSync(EXPO_BETA_APP_DIR, { recursive: true, force: true });
  mkdirSync(path.dirname(EXPO_BETA_APP_DIR), { recursive: true });
  cpSync(getExpoTemplateAppDir(), EXPO_BETA_APP_DIR, { recursive: true });

  updateFileContents(EXPO_BETA_PACKAGE_JSON_PATH, replaceTemplateAppReferences);

  updateFileContents(EXPO_BETA_APP_JSON_PATH, replaceTemplateAppReferences);

  const testPath = path.join(EXPO_BETA_APP_DIR, '__tests__', 'brownfield.example.test.tsx');
  if (existsSync(testPath)) {
    updateFileContents(testPath, replaceTemplateAppReferences);
  }

  const homeScreenPath = path.join(EXPO_BETA_APP_DIR, 'src', 'app', 'index.tsx');
  if (existsSync(homeScreenPath)) {
    updateFileContents(homeScreenPath, (contents) =>
      contents
        .replaceAll('Expo\u00a056', 'Expo\u00a0Beta')
        .replaceAll('Expo\u00a055', 'Expo\u00a0Beta')
        .replaceAll('Expo&nbsp;56', 'Expo&nbsp;Beta')
        .replaceAll('Expo&nbsp;55', 'Expo&nbsp;Beta')
    );
  }
}

function readExpoBetaPackageJson(): ExpoPackageJson {
  return JSON.parse(readFileSync(EXPO_BETA_PACKAGE_JSON_PATH, 'utf8')) as ExpoPackageJson;
}

function writeExpoBetaPackageJson(packageJson: ExpoPackageJson): void {
  writeFileSync(EXPO_BETA_PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

export function updateExpoVersion(packageJson: ExpoPackageJson, expoVersion: string): boolean {
  if (!packageJson.dependencies?.expo) {
    throw new Error('Could not locate dependencies.expo in ExpoAppBeta/package.json');
  }

  if (packageJson.dependencies.expo === expoVersion) {
    return false;
  }

  packageJson.dependencies.expo = expoVersion;
  return true;
}

function appendKeyValueFile(filePath: string | undefined, entries: Record<string, string>): void {
  if (!filePath) {
    return;
  }

  const lines = Object.entries(entries).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function appendSummary(
  filePath: string | undefined,
  {
    latestVersion,
    testedVersion,
    shouldTest,
    applied,
    generated,
  }: {
    latestVersion: string | null;
    testedVersion?: string;
    shouldTest: boolean;
    applied: boolean;
    generated: boolean;
  }
): void {
  if (!filePath) {
    return;
  }

  const lines = [
    '## Expo beta check',
    '',
    `- Latest Expo beta: ${latestVersion ?? 'not found'}`,
    `- Last tested Expo beta: ${testedVersion ?? 'none'}`,
    `- Should run road tests: ${shouldTest ? 'yes' : 'no'}`,
    `- ExpoAppBeta generated on-the-fly: ${generated ? 'yes' : 'no'}`,
    `- ExpoAppBeta package.json updated: ${applied ? 'yes' : 'no'}`,
    '',
  ];

  fs.appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const latestVersion = options.expoVersion ?? (await fetchLatestExpoCanaryVersion());

  if (!latestVersion) {
    appendKeyValueFile(options.githubOutput, {
      latest_version: '',
      should_test: 'false',
      applied: 'false',
      generated: 'false',
    });
    appendSummary(options.githubStepSummary, {
      latestVersion: null,
      testedVersion: options.testedVersion,
      shouldTest: false,
      applied: false,
      generated: false,
    });
    console.log('No Expo beta release found');
    return;
  }

  const shouldTest = latestVersion !== options.testedVersion;
  let applied = false;
  let generated = false;

  if (shouldTest && options.apply) {
    generateExpoBetaApp();
    generated = true;
    const packageJson = readExpoBetaPackageJson();
    applied = updateExpoVersion(packageJson, latestVersion);
    writeExpoBetaPackageJson(packageJson);
  }

  appendKeyValueFile(options.githubOutput, {
    latest_version: latestVersion,
    should_test: shouldTest ? 'true' : 'false',
    applied: applied ? 'true' : 'false',
    generated: generated ? 'true' : 'false',
  });

  appendSummary(options.githubStepSummary, {
    latestVersion,
    testedVersion: options.testedVersion,
    shouldTest,
    applied,
    generated,
  });

  console.log(`Latest Expo beta: ${latestVersion}`);
  console.log(`Last tested Expo beta: ${options.testedVersion ?? 'none'}`);
  console.log(`Should test: ${shouldTest}`);
  console.log(`Generated ExpoAppBeta: ${generated}`);
  console.log(`Applied: ${applied}`);
}

main();
