import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_SPEC_FILENAME } from './config.js';

export function resolveNavigationSpecPath(
  specPath: string | undefined,
  projectRoot: string
): string {
  if (specPath) {
    return path.isAbsolute(specPath)
      ? specPath
      : path.resolve(projectRoot, specPath);
  }

  return path.resolve(projectRoot, DEFAULT_SPEC_FILENAME);
}

export function isNavigationSpecPresent(
  specPath: string | undefined,
  projectRoot: string = process.cwd()
): boolean {
  const resolvedSpecPath = resolveNavigationSpecPath(specPath, projectRoot);
  return fs.existsSync(resolvedSpecPath);
}
