import fs from 'node:fs';
import path from 'node:path';

import { logger } from '@rock-js/tools';

function normalizeIosSourceDir(projectRoot: string, sourceDir: string) {
  if (path.isAbsolute(sourceDir)) {
    return sourceDir;
  }

  return path.join(projectRoot, sourceDir.trim().length > 0 ? sourceDir : 'ios');
}

function copyDirectoryIfExists(sourcePath: string, destinationPath: string) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  if (fs.existsSync(destinationPath)) {
    fs.rmSync(destinationPath, { recursive: true, force: true });
  }

  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });

  return true;
}

export function copyBundledXcframeworks({
  packageDir,
  projectRoot,
  reactNativeVersion,
  sourceDir,
}: {
  packageDir: string;
  projectRoot: string;
  reactNativeVersion: string;
  sourceDir: string;
}) {
  const iosSourceDir = normalizeIosSourceDir(projectRoot, sourceDir);

  const hermesFrameworkName =
    Number.parseInt(reactNativeVersion.split('.')[1] ?? '0', 10) >= 82
      ? 'hermesvm.xcframework'
      : 'hermes.xcframework';
  const hermesSourcePath = path.join(
    iosSourceDir,
    'Pods',
    'hermes-engine',
    'destroot',
    'Library',
    'Frameworks',
    'universal',
    hermesFrameworkName
  );
  const reactSourcePath = path.join(
    iosSourceDir,
    'Pods',
    'React-Core-prebuilt',
    'React.xcframework'
  );
  const reactNativeDependenciesSourcePath = path.join(
    iosSourceDir,
    'Pods',
    'ReactNativeDependencies',
    'framework',
    'packages',
    'react-native',
    'ReactNativeDependencies.xcframework'
  );

  const copies = [
    [hermesSourcePath, path.join(packageDir, hermesFrameworkName)],
    [reactSourcePath, path.join(packageDir, 'React.xcframework')],
    [
      reactNativeDependenciesSourcePath,
      path.join(packageDir, 'ReactNativeDependencies.xcframework'),
    ],
  ] as const;

  for (const [sourcePath, destinationPath] of copies) {
    if (copyDirectoryIfExists(sourcePath, destinationPath)) {
      logger.log(`Copied ${destinationPath}`);
    }
  }
}
