import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const ROOT_CHANGELOG = path.join(ROOT_DIR, 'CHANGELOG.md');

const SECTION_ORDER = ['Major Changes', 'Minor Changes', 'Patch Changes'];

interface ParsedVersion {
  version: string;
  sections: Map<string, string[]>;
}

function extractEntryKey(entry: string): string {
  const prMatch = entry.match(/\[#(\d+)\]/);
  if (prMatch) return `pr-${prMatch[1]}`;

  const hashMatch = entry.match(/\[`([a-f0-9]{7,40})`\]/);
  if (hashMatch) return `commit-${hashMatch[1]}`;

  return entry.trim();
}

function parseEntries(block: string): string[] {
  const entries: string[] = [];
  let current: string[] = [];

  for (const line of block.split('\n')) {
    if (line.startsWith('- ')) {
      if (current.length > 0) entries.push(current.join('\n').trim());
      current = [line];
    } else if (line.startsWith('  ') && current.length > 0) {
      current.push(line);
    }
    // blank lines and non-indented non-bullet lines within a block are ignored
  }

  if (current.length > 0) entries.push(current.join('\n').trim());

  return entries.filter((e) => e.length > 0);
}

function parseLatestVersion(content: string): ParsedVersion | null {
  const lines = content.split('\n');

  let vStart = -1;
  let version = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^## (\d+\.\d+\.\d+)/);
    if (m) {
      vStart = i;
      version = m[1];
      break;
    }
  }
  if (vStart === -1) return null;

  let vEnd = lines.length;
  for (let i = vStart + 1; i < lines.length; i++) {
    if (lines[i].match(/^## /)) {
      vEnd = i;
      break;
    }
  }

  const sectionContent = lines.slice(vStart + 1, vEnd).join('\n');
  const subsectionHeaders = [...sectionContent.matchAll(/^### (.+)$/gm)];
  const subsectionBodies = sectionContent.split(/^### .+$/m);

  const sections = new Map<string, string[]>();

  for (let i = 0; i < subsectionHeaders.length; i++) {
    const name = subsectionHeaders[i][1].trim();
    const body = subsectionBodies[i + 1] ?? '';
    const entries = parseEntries(body);

    if (entries.length > 0) {
      sections.set(name, entries);
    }
  }

  return { version, sections };
}

function consolidate(): void {
  const changelogPaths = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(PACKAGES_DIR, d.name, 'CHANGELOG.md'))
    .filter((p) => fs.existsSync(p))
    .sort();

  if (changelogPaths.length === 0) {
    console.error('No package CHANGELOG files found.');
    process.exit(1);
  }

  let targetVersion: string | null = null;
  const consolidated = new Map<string, Map<string, string>>();

  for (const changelogPath of changelogPaths) {
    const parsed = parseLatestVersion(fs.readFileSync(changelogPath, 'utf-8'));
    if (!parsed) continue;

    if (!targetVersion) {
      targetVersion = parsed.version;
    } else if (parsed.version !== targetVersion) {
      console.warn(
        `Version mismatch: expected ${targetVersion}, got ${parsed.version} in ${changelogPath}`
      );
      continue;
    }

    for (const [section, entries] of parsed.sections) {
      if (!consolidated.has(section)) consolidated.set(section, new Map());
      const target = consolidated.get(section)!;
      for (const entry of entries) {
        const key = extractEntryKey(entry);
        if (!target.has(key)) target.set(key, entry);
      }
    }
  }

  if (!targetVersion) {
    console.error('Could not determine release version from package CHANGELOGs.');
    process.exit(1);
  }

  if (consolidated.size === 0) {
    console.log(
      `No substantive entries for ${targetVersion} (all filtered as "Updated dependencies"), skipping root CHANGELOG update.`
    );
    return;
  }

  // Idempotency: skip if this version is already in the root CHANGELOG
  if (fs.existsSync(ROOT_CHANGELOG)) {
    const existing = fs.readFileSync(ROOT_CHANGELOG, 'utf-8');
    const escapedVersion = targetVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const versionHeadingRe = new RegExp(`^##\\s+${escapedVersion}(\\s|$)`, 'm');
    if (versionHeadingRe.test(existing)) {
      console.log(`Root CHANGELOG already contains ${targetVersion}, skipping.`);
      return;
    }
  }

  // Build new version block
  const block: string[] = [`## ${targetVersion}`, ''];

  const orderedSections = [
    ...SECTION_ORDER.filter((s) => consolidated.has(s)),
    ...[...consolidated.keys()].filter((s) => !SECTION_ORDER.includes(s)),
  ];

  for (const section of orderedSections) {
    const entries = [...consolidated.get(section)!.values()];
    if (entries.length === 0) continue;
    block.push(`### ${section}`, '');
    for (const entry of entries) {
      block.push(entry, '');
    }
  }

  const newBlock = block.join('\n');

  let header: string;
  let body: string;

  if (fs.existsSync(ROOT_CHANGELOG)) {
    const content = fs.readFileSync(ROOT_CHANGELOG, 'utf-8');
    const firstHeadingMatch = content.match(/^## /m);
    if (firstHeadingMatch && firstHeadingMatch.index !== undefined) {
      header = content.slice(0, firstHeadingMatch.index);
      body = content.slice(firstHeadingMatch.index);
    } else {
      header = content.endsWith('\n') ? content : content + '\n';
      body = '';
    }
  } else {
    header = `# Changelog\n\n_History prior to ${targetVersion} is available in the per-package CHANGELOG files._\n\n`;
    body = '';
  }

  fs.writeFileSync(
    ROOT_CHANGELOG,
    header + newBlock + (body ? '\n' + body : '\n'),
    'utf-8'
  );
  console.log(`✓ Root CHANGELOG.md updated with ${targetVersion}`);
}

consolidate();