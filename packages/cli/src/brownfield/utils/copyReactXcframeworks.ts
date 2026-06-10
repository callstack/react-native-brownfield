import fs from 'node:fs';
import path from 'node:path';

import { colorLink, logger } from '@rock-js/tools';

export function copyReactXcframeworks({
  sourceDir,
  destinationDir,
}: {
  sourceDir: string;
  destinationDir: string;
}) {
  const frameworks = [
    {
      name: 'React.xcframework',
      sourcePath: path.join(sourceDir, 'Pods/React-Core-prebuilt/React.xcframework'),
    },
    {
      name: 'ReactNativeDependencies.xcframework',
      sourcePath: path.join(
        sourceDir,
        'Pods/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework'
      ),
    },
  ];

  for (const { name, sourcePath } of frameworks) {
    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const destinationPath = path.join(destinationDir, name);

    if (fs.existsSync(destinationPath)) {
      fs.rmSync(destinationPath, { recursive: true, force: true });
    }

    fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });

    const codeSignaturePath = path.join(destinationPath, '_CodeSignature');
    if (fs.existsSync(codeSignaturePath)) {
      // Expo may rewrite modulemaps inside copied RN prebuilts, which invalidates
      // the upstream XCFramework seal. We package these as local artifacts, so
      // keep the contents and drop the stale signature bundle.
      fs.rmSync(codeSignaturePath, { recursive: true, force: true });
    }

    logger.debug(`Copied ${colorLink(destinationPath)}`);
  }
}
