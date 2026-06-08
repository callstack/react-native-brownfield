import fs from 'node:fs';
import path from 'node:path';

import { RockError } from '@rock-js/tools';

export const BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_GRADLE_PROPERTY =
  'brownfieldNavigationAndroidGeneratedSourceDir';

const BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR = `ORG_GRADLE_PROJECT_${BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_GRADLE_PROPERTY}`;

export function resolveNavigationAndroidSourceDir(
  projectRoot: string,
  outputDir?: string
): string | undefined {
  if (!outputDir) {
    return undefined;
  }

  return path.join(
    path.resolve(projectRoot, outputDir),
    'android',
    'src',
    'main',
    'java'
  );
}

export async function withNavigationAndroidSourceDirProperty<T>({
  projectRoot,
  outputDir,
  run,
}: {
  projectRoot: string;
  outputDir?: string;
  run: () => Promise<T>;
}): Promise<T> {
  const navigationAndroidSourceDir = resolveNavigationAndroidSourceDir(
    projectRoot,
    outputDir
  );

  if (!navigationAndroidSourceDir) {
    return run();
  }

  if (!fs.existsSync(navigationAndroidSourceDir)) {
    throw new RockError(
      `Navigation Android generated sources not found at ${navigationAndroidSourceDir}. Verify --output-dir points to a valid navigation codegen output root.`
    );
  }

  const previousValue =
    process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR];
  process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR] =
    navigationAndroidSourceDir;

  try {
    return await run();
  } finally {
    if (previousValue === undefined) {
      delete process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR];
    } else {
      process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR] =
        previousValue;
    }
  }
}
