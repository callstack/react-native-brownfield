import fs from 'node:fs';
import path from 'node:path';
import {
  cpSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
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
const EXPO_PREVIEW_APP_DIR = path.join(REPO_ROOT, 'apps', 'ExpoAppPreview');
const EXPO_PREVIEW_PACKAGE_JSON_PATH = path.join(
  EXPO_PREVIEW_APP_DIR,
  'package.json'
);
const EXPO_PREVIEW_APP_JSON_PATH = path.join(EXPO_PREVIEW_APP_DIR, 'app.json');
const EXPO_PREVIEW_BROWNFIELD_CONFIG_PATH = path.join(
  EXPO_PREVIEW_APP_DIR,
  'brownfield.config.json'
);
const EXPO_PREVIEW_NAVIGATION_SPEC_PATH = path.join(
  EXPO_PREVIEW_APP_DIR,
  'brownfield.navigation.ts'
);
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

export function findLatestPreviewVersion(versions: string[]): string | null {
  const previewVersions = versions
    .filter((version) => version.includes('-preview'))
    .sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true })
    );

  return previewVersions.at(-1) ?? null;
}

export async function fetchLatestExpoPreviewVersion(): Promise<string | null> {
  const response = await fetch(EXPO_NPM_REGISTRY_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Expo metadata: ${response.status}`);
  }

  const data = (await response.json()) as {
    versions?: Record<string, unknown>;
  };

  return findLatestPreviewVersion(Object.keys(data.versions ?? {}));
}

function updateFileContents(
  filePath: string,
  updater: (contents: string) => string
): void {
  const contents = readFileSync(filePath, 'utf8');
  writeFileSync(filePath, updater(contents), 'utf8');
}

interface ExpoTemplateApp {
  path: string;
  version: number;
  name: string;
}

function getExpoTemplateApp(): ExpoTemplateApp {
  const appsDir = path.join(REPO_ROOT, 'apps');
  const expoAppCandidates = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^ExpoApp\d+$/.test(entry.name))
    .map((entry) => ({
      path: path.join(appsDir, entry.name),
      version: Number(entry.name.replace('ExpoApp', '')),
      name: entry.name,
    }))
    .sort((left, right) => right.version - left.version);

  const latestCandidate = expoAppCandidates[0];
  if (!latestCandidate) {
    throw new Error('Could not find an Expo template app directory');
  }

  return latestCandidate;
}

export function replaceTemplateAppReferences(
  contents: string,
  templateVersion: number,
  templateName: string
): string {
  const version = templateVersion.toString();

  return contents
    .replaceAll(
      `@callstack/brownfield-example-expo-app-${version}`,
      '@callstack/brownfield-example-expo-app-preview'
    )
    .replaceAll(
      `com.callstack.rnbrownfield.demo.expoapp${version}`,
      'com.callstack.rnbrownfield.demo.expoapppreview'
    )
    .replaceAll(
      `./android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expoapp${version}/Generated/`,
      './android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expoapppreview/Generated/'
    )
    .replaceAll(templateName, 'ExpoAppPreview')
    .replaceAll(`expoapp${version}`, 'expoapppreview')
    .replaceAll(`expoapppreview${version}`, 'expoapppreview');
}

export function replaceHomeScreenTitle(
  contents: string,
  templateVersion: number
): string {
  const version = templateVersion.toString();

  return contents
    .replaceAll(`Expo\u00a0${version}`, 'Expo\u00a0Preview')
    .replaceAll(`Expo&nbsp;${version}`, 'Expo&nbsp;Preview');
}

const CONSUMER_ROAD_TEST_NAVIGATION_METHODS = `
  /**
   * Ask the native host to confirm an action. Resolves with the user's choice.
   */
  requestNativeConfirmation(title: string): Promise<boolean>;

  /**
   * Show a native banner. The native host calls onDismiss when the banner is dismissed.
   */
  showNativeBanner(message: string, onDismiss: () => void): void;
`;

export function ensureConsumerNavigationSpec(contents: string): string {
  if (contents.includes('requestNativeConfirmation')) {
    return contents;
  }

  return contents.replace(
    '  navigateToReferrals(userId: string): void;\n}',
    `  navigateToReferrals(userId: string): void;${CONSUMER_ROAD_TEST_NAVIGATION_METHODS}\n}`
  );
}

function generateExpoPreviewApp(): void {
  const templateApp = getExpoTemplateApp();
  const replaceReferences = (contents: string) =>
    replaceTemplateAppReferences(
      contents,
      templateApp.version,
      templateApp.name
    );

  rmSync(EXPO_PREVIEW_APP_DIR, { recursive: true, force: true });
  mkdirSync(path.dirname(EXPO_PREVIEW_APP_DIR), { recursive: true });
  cpSync(templateApp.path, EXPO_PREVIEW_APP_DIR, { recursive: true });

  updateFileContents(EXPO_PREVIEW_PACKAGE_JSON_PATH, replaceReferences);

  updateFileContents(EXPO_PREVIEW_APP_JSON_PATH, replaceReferences);

  if (existsSync(EXPO_PREVIEW_BROWNFIELD_CONFIG_PATH)) {
    updateFileContents(EXPO_PREVIEW_BROWNFIELD_CONFIG_PATH, replaceReferences);
  }

  if (existsSync(EXPO_PREVIEW_NAVIGATION_SPEC_PATH)) {
    updateFileContents(EXPO_PREVIEW_NAVIGATION_SPEC_PATH, ensureConsumerNavigationSpec);
  }

  const testPath = path.join(
    EXPO_PREVIEW_APP_DIR,
    '__tests__',
    'brownfield.example.test.tsx'
  );
  if (existsSync(testPath)) {
    updateFileContents(testPath, replaceReferences);
  }

  const homeScreenPath = path.join(
    EXPO_PREVIEW_APP_DIR,
    'src',
    'app',
    'index.tsx'
  );
  if (existsSync(homeScreenPath)) {
    updateFileContents(homeScreenPath, (contents) =>
      replaceHomeScreenTitle(contents, templateApp.version)
    );
  }
}

function readExpoPreviewPackageJson(): ExpoPackageJson {
  return JSON.parse(
    readFileSync(EXPO_PREVIEW_PACKAGE_JSON_PATH, 'utf8')
  ) as ExpoPackageJson;
}

function writeExpoPreviewPackageJson(packageJson: ExpoPackageJson): void {
  writeFileSync(
    EXPO_PREVIEW_PACKAGE_JSON_PATH,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8'
  );
}

export function updateExpoVersion(
  packageJson: ExpoPackageJson,
  expoVersion: string
): boolean {
  if (!packageJson.dependencies?.expo) {
    throw new Error(
      'Could not locate dependencies.expo in ExpoAppPreview/package.json'
    );
  }

  if (packageJson.dependencies.expo === expoVersion) {
    return false;
  }

  packageJson.dependencies.expo = expoVersion;
  return true;
}

function appendKeyValueFile(
  filePath: string | undefined,
  entries: Record<string, string>
): void {
  if (!filePath) {
    return;
  }

  const lines = Object.entries(entries).map(
    ([key, value]) => `${key}=${value}`
  );
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
    '## Expo preview check',
    '',
    `- Latest Expo preview: ${latestVersion ?? 'not found'}`,
    `- Last tested Expo preview: ${testedVersion ?? 'none'}`,
    `- Should run road tests: ${shouldTest ? 'yes' : 'no'}`,
    `- ExpoAppPreview generated on-the-fly: ${generated ? 'yes' : 'no'}`,
    `- ExpoAppPreview package.json updated: ${applied ? 'yes' : 'no'}`,
    '',
  ];

  fs.appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const latestVersion =
    options.expoVersion ?? (await fetchLatestExpoPreviewVersion());

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
    console.log('No Expo preview release found');
    return;
  }

  const shouldTest = latestVersion !== options.testedVersion;
  let applied = false;
  let generated = false;

  if (shouldTest && options.apply) {
    generateExpoPreviewApp();
    generated = true;
    const packageJson = readExpoPreviewPackageJson();
    applied = updateExpoVersion(packageJson, latestVersion);
    writeExpoPreviewPackageJson(packageJson);
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

  console.log(`Latest Expo preview: ${latestVersion}`);
  console.log(`Last tested Expo preview: ${options.testedVersion ?? 'none'}`);
  console.log(`Should test: ${shouldTest}`);
  console.log(`Generated ExpoAppPreview: ${generated}`);
  console.log(`Applied: ${applied}`);
}

main();
