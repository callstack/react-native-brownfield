import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PluginCommit {
  hash: string;
  subject: string;
}

interface RenderOptions {
  version: string;
  ref: string;
  previousTag: string | null;
  commits: PluginCommit[];
}

interface ScriptOptions {
  version: string;
  ref: string;
  output: string;
  repoRoot?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..');

export const PLUGIN_RELEVANT_PATHS = [
  'gradle-plugins/react',
  'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts',
  'apps/scripts/prepare-android-build-gradle-for-ci.ts',
  'gradle-plugins/react/README.md',
  'apps/RNApp/android/build.gradle',
];

const PLUGIN_TAG_PATTERNS = [
  /^brownfield-gradle-plugin\/v(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/,
  /^@callstack\/brownfield-gradle-plugin@v?(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/,
  /^@callsack\/brownfield-gradle-plugin@v?(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/,
];

interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

function parseVersion(version: string): ParsedSemVer {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/
  );
  if (!match) {
    throw new Error(`Unsupported semantic version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function comparePrereleaseIdentifiers(left: string, right: string): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }

  if (leftNumeric) return -1;
  if (rightNumeric) return 1;

  return left.localeCompare(right);
}

function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);

  if (leftVersion.major !== rightVersion.major) {
    return leftVersion.major - rightVersion.major;
  }
  if (leftVersion.minor !== rightVersion.minor) {
    return leftVersion.minor - rightVersion.minor;
  }
  if (leftVersion.patch !== rightVersion.patch) {
    return leftVersion.patch - rightVersion.patch;
  }

  const leftHasPrerelease = leftVersion.prerelease.length > 0;
  const rightHasPrerelease = rightVersion.prerelease.length > 0;

  if (!leftHasPrerelease && !rightHasPrerelease) return 0;
  if (!leftHasPrerelease) return 1;
  if (!rightHasPrerelease) return -1;

  const maxLength = Math.max(
    leftVersion.prerelease.length,
    rightVersion.prerelease.length
  );

  for (let index = 0; index < maxLength; index += 1) {
    const leftIdentifier = leftVersion.prerelease[index];
    const rightIdentifier = rightVersion.prerelease[index];

    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;

    const result = comparePrereleaseIdentifiers(leftIdentifier, rightIdentifier);
    if (result !== 0) return result;
  }

  return 0;
}

function extractPluginTagVersion(tag: string): string | null {
  for (const pattern of PLUGIN_TAG_PATTERNS) {
    const match = tag.match(pattern);
    if (match?.groups?.version) {
      return match.groups.version;
    }
  }

  return null;
}

export function findPreviousPluginTag(
  tags: string[],
  targetVersion: string
): string | null {
  return tags
    .map((tag) => ({ tag, version: extractPluginTagVersion(tag) }))
    .filter((entry): entry is { tag: string; version: string } => {
      return entry.version !== null && compareVersions(entry.version, targetVersion) < 0;
    })
    .sort((left, right) => compareVersions(right.version, left.version))[0]?.tag ?? null;
}

function categorizeCommit(subject: string): 'Features' | 'Fixes' | 'Docs' | 'Maintenance' | 'Other Changes' {
  const prefix = subject.match(/^([a-z]+)(?:\([^)]+\))?!?:/i)?.[1]?.toLowerCase();

  switch (prefix) {
    case 'feat':
      return 'Features';
    case 'fix':
      return 'Fixes';
    case 'docs':
      return 'Docs';
    case 'chore':
    case 'refactor':
      return 'Maintenance';
    default:
      return 'Other Changes';
  }
}

export function renderReleaseNotes(options: RenderOptions): string {
  const sectionOrder: Array<ReturnType<typeof categorizeCommit>> = [
    'Features',
    'Fixes',
    'Docs',
    'Maintenance',
    'Other Changes',
  ];

  const sections = new Map(sectionOrder.map((section) => [section, [] as string[]]));

  for (const commit of options.commits) {
    sections.get(categorizeCommit(commit.subject))!.push(
      `- \`${commit.hash}\` ${commit.subject}`
    );
  }

  const compareRange = options.previousTag
    ? `${options.previousTag}...${options.ref}`
    : `initial history...${options.ref}`;

  const lines: string[] = [
    `# Brownfield Gradle Plugin ${options.version}`,
    '',
    `Compare: \`${compareRange}\``,
    '',
  ];

  for (const section of sectionOrder) {
    const entries = sections.get(section)!;
    if (entries.length === 0) continue;

    lines.push(`## ${section}`, '', ...entries, '');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
}

function listPluginTags(repoRoot: string): string[] {
  const output = runGit(repoRoot, ['tag', '--sort=creatordate']);
  return output === '' ? [] : output.split('\n');
}

function collectCommits(
  repoRoot: string,
  previousTag: string | null,
  ref: string
): PluginCommit[] {
  const range = previousTag ? `${previousTag}..${ref}` : ref;
  const output = runGit(repoRoot, [
    'log',
    '--format=%H%x09%s',
    range,
    '--',
    ...PLUGIN_RELEVANT_PATHS,
  ]);

  if (output === '') return [];

  return output.split('\n').map((line) => {
    const [hash, subject] = line.split('\t');
    return {
      hash: hash.slice(0, 7),
      subject,
    };
  });
}

function parseArgs(argv: string[]): ScriptOptions {
  const options: Partial<ScriptOptions> = { ref: 'HEAD' };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    switch (arg) {
      case '--version':
        options.version = value;
        index += 1;
        break;
      case '--ref':
        options.ref = value;
        index += 1;
        break;
      case '--output':
        options.output = value;
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.version) {
    throw new Error('Missing required argument: --version');
  }

  if (!options.output) {
    throw new Error('Missing required argument: --output');
  }

  return options as ScriptOptions;
}

export function generateReleaseNotes(options: ScriptOptions): {
  previousTag: string | null;
  notes: string;
  commits: PluginCommit[];
} {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const tags = listPluginTags(repoRoot);
  const previousTag = findPreviousPluginTag(tags, options.version);
  const commits = collectCommits(repoRoot, previousTag, options.ref);
  const notes = renderReleaseNotes({
    version: options.version,
    ref: options.ref,
    previousTag,
    commits,
  });

  return { previousTag, notes, commits };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = generateReleaseNotes(options);
  fs.writeFileSync(options.output, result.notes, 'utf8');

  console.log(`previous plugin tag: ${result.previousTag ?? 'none'}`);
  console.log(`collected ${result.commits.length} plugin-relevant commits`);
  console.log(`wrote ${options.output}`);
}

if (process.argv[1] === __filename) {
  main();
}
