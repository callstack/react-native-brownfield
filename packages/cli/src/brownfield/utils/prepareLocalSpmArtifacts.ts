import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

type PrepareLocalSpmArtifactsOptions = {
  packageDir: string;
  targetNames: string[];
};

export const SPM_ARTIFACTS_DIR_NAME = 'spm-artifacts';

function removeCodeSignatureArtifacts(dirPath: string) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '_CodeSignature') {
        fs.rmSync(entryPath, { recursive: true, force: true });
        continue;
      }

      removeCodeSignatureArtifacts(entryPath);
      continue;
    }

    if (entry.name === 'CodeResources') {
      fs.rmSync(entryPath, { force: true });
    }
  }
}

function resolveFrameworkExecutablePath(
  frameworkDir: string,
  frameworkName: string
) {
  const directExecutablePath = path.join(frameworkDir, frameworkName);
  if (fs.existsSync(directExecutablePath)) {
    return directExecutablePath;
  }

  const versionedExecutablePath = path.join(
    frameworkDir,
    'Versions',
    'Current',
    frameworkName
  );
  if (fs.existsSync(versionedExecutablePath)) {
    return versionedExecutablePath;
  }

  return null;
}

function removeExecutableSignature(executablePath: string) {
  try {
    execFileSync('codesign', ['--remove-signature', executablePath], {
      stdio: 'pipe',
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('code object is not signed at all')
    ) {
      return;
    }

    throw error;
  }
}

function normalizeCopiedXcframeworkSignature(xcframeworkPath: string) {
  for (const sliceName of fs.readdirSync(xcframeworkPath)) {
    const slicePath = path.join(xcframeworkPath, sliceName);
    if (!fs.statSync(slicePath).isDirectory()) {
      continue;
    }

    for (const entry of fs.readdirSync(slicePath)) {
      if (!entry.endsWith('.framework')) {
        continue;
      }

      const frameworkName = path.basename(entry, '.framework');
      const frameworkDir = path.join(slicePath, entry);
      const executablePath = resolveFrameworkExecutablePath(
        frameworkDir,
        frameworkName
      );

      removeCodeSignatureArtifacts(frameworkDir);

      if (executablePath) {
        removeExecutableSignature(executablePath);
      }
    }
  }
}

export function prepareLocalSpmArtifacts({
  packageDir,
  targetNames,
}: PrepareLocalSpmArtifactsOptions) {
  const spmArtifactsDir = path.join(packageDir, SPM_ARTIFACTS_DIR_NAME);

  fs.rmSync(spmArtifactsDir, { recursive: true, force: true });
  fs.mkdirSync(spmArtifactsDir, { recursive: true });

  for (const targetName of targetNames) {
    const sourcePath = path.join(packageDir, `${targetName}.xcframework`);
    const destinationPath = path.join(spmArtifactsDir, `${targetName}.xcframework`);

    fs.cpSync(sourcePath, destinationPath, { recursive: true });
    normalizeCopiedXcframeworkSignature(destinationPath);
  }

  return spmArtifactsDir;
}
