import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

const sourcePath = path.join(repoRoot, 'packages', 'cli', 'schema.json');
const targetPath = path.join(repoRoot, 'docs', 'docs', 'public', 'schema.json');

await fs.copyFile(sourcePath, targetPath);
