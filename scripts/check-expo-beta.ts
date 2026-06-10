import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  expoVersion?: string;
  testedVersion?: string;
  apply?: boolean;
  githubOutput?: string;
  githubStepSummary?: string;
}

export interface ExpoPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXPO_APP_56_PACKAGE_JSON_PATH = path.join(
  REPO_ROOT,
  'apps',
  'ExpoApp56',
  'package.json'
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

export async function fetchLatestExpoBetaVersion(): Promise<string | null> {
  const response = await fetch(EXPO_NPM_REGISTRY_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Expo metadata: ${response.status}`);
  }

  const data = (await response.json()) as {
    'dist-tags'?: Record<string, string>;
    versions?: Record<string, unknown>;
  };

  const betaTag = data['dist-tags']?.beta;
  if (betaTag) {
    return betaTag;
  }

  const versions = Object.keys(data.versions ?? {}).filter((version) =>
    version.includes('beta')
  );

  return versions.at(-1) ?? null;
}

function readExpoApp56PackageJson(): ExpoPackageJson {
  return JSON.parse(
    fs.readFileSync(EXPO_APP_56_PACKAGE_JSON_PATH, 'utf8')
  ) as ExpoPackageJson;
}

function writeExpoApp56PackageJson(packageJson: ExpoPackageJson): void {
  fs.writeFileSync(
    EXPO_APP_56_PACKAGE_JSON_PATH,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8'
  );
}

export function updateExpoVersion(packageJson: ExpoPackageJson, expoVersion: string): boolean {
  if (!packageJson.dependencies?.expo) {
    throw new Error('Could not locate dependencies.expo in ExpoApp56/package.json');
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
  }: {
    latestVersion: string | null;
    testedVersion?: string;
    shouldTest: boolean;
    applied: boolean;
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
    `- ExpoApp56 package.json updated: ${applied ? 'yes' : 'no'}`,
    '',
  ];

  fs.appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const latestVersion = options.expoVersion ?? (await fetchLatestExpoBetaVersion());

  if (!latestVersion) {
    appendKeyValueFile(options.githubOutput, {
      latest_version: '',
      should_test: 'false',
      applied: 'false',
    });
    appendSummary(options.githubStepSummary, {
      latestVersion: null,
      testedVersion: options.testedVersion,
      shouldTest: false,
      applied: false,
    });
    console.log('No Expo beta release found');
    return;
  }

  const shouldTest = latestVersion !== options.testedVersion;
  let applied = false;

  if (shouldTest && options.apply) {
    const packageJson = readExpoApp56PackageJson();
    applied = updateExpoVersion(packageJson, latestVersion);
    if (applied) {
      writeExpoApp56PackageJson(packageJson);
    }
  }

  appendKeyValueFile(options.githubOutput, {
    latest_version: latestVersion,
    should_test: shouldTest ? 'true' : 'false',
    applied: applied ? 'true' : 'false',
  });

  appendSummary(options.githubStepSummary, {
    latestVersion,
    testedVersion: options.testedVersion,
    shouldTest,
    applied,
  });

  console.log(`Latest Expo beta: ${latestVersion}`);
  console.log(`Last tested Expo beta: ${options.testedVersion ?? 'none'}`);
  console.log(`Should test: ${shouldTest}`);
  console.log(`Applied: ${applied}`);
}

main();
