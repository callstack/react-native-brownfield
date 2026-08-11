import fs from 'node:fs';
import path from 'node:path';

import { normalizeCopiedXcframework } from './normalizeCopiedXcframework.js';

type PrepareLocalSpmArtifactsOptions = {
  packageDir: string;
  targetNames: string[];
};

export const SPM_ARTIFACTS_DIR_NAME = 'spm-artifacts';

export function prepareLocalSpmArtifacts({
  packageDir,
  targetNames,
}: PrepareLocalSpmArtifactsOptions) {
  const spmArtifactsDir = path.join(packageDir, SPM_ARTIFACTS_DIR_NAME);

  fs.rmSync(spmArtifactsDir, { recursive: true, force: true });
  fs.mkdirSync(spmArtifactsDir, { recursive: true });

  for (const targetName of targetNames) {
    const sourcePath = path.join(packageDir, `${targetName}.xcframework`);
    const destinationPath = path.join(
      spmArtifactsDir,
      `${targetName}.xcframework`
    );

    fs.renameSync(sourcePath, destinationPath);
    normalizeCopiedXcframework(destinationPath);
  }

  return spmArtifactsDir;
}
