import fs from 'node:fs';
import path from 'node:path';

import { colorLink, logger, versionCompare } from '@rock-js/tools';

export function copyHermesXcframework({
  sourceDir,
  destinationDir,
  reactNativeVersion,
}: {
  sourceDir: string;
  destinationDir: string;
  reactNativeVersion: string;
}) {
  const hermesFrameworkName =
    versionCompare(reactNativeVersion, '0.82.0') >= 0
      ? 'hermesvm.xcframework'
      : 'hermes.xcframework';

  const sourcePath = path.join(
    sourceDir,
    `Pods/hermes-engine/destroot/Library/Frameworks/universal/${hermesFrameworkName}`
  );
  const destinationPath = path.join(destinationDir, hermesFrameworkName);

  if (fs.existsSync(destinationPath)) {
    fs.rmSync(destinationPath, { recursive: true, force: true });
  }

  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
  logger.debug(`Copied ${colorLink(destinationPath)}`);
}
