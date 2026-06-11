import fs from 'node:fs';
import path from 'node:path';

import { colorLink, logger } from '@rock-js/tools';

function listFiles(rootDir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function materializeReactVirtualHeaders(headersRoot: string) {
  if (!fs.existsSync(headersRoot)) {
    return;
  }

  for (const sourcePath of listFiles(headersRoot)) {
    const relativePath = path.relative(headersRoot, sourcePath);
    const pathSegments = relativePath.split(path.sep);
    const aliasSegments =
      pathSegments.length >= 3 ? pathSegments.slice(1) : pathSegments;
    const aliasPath = path.join(headersRoot, ...aliasSegments);

    if (aliasPath === sourcePath || fs.existsSync(aliasPath)) {
      continue;
    }

    // React prebuilts rely on a VFS overlay that exposes aliases like
    // Headers/React/RCTBridge.h for files stored under buckets like
    // Headers/React_Core/React/RCTBridge.h. Materialize those aliases so
    // consumer apps can compile without the original CocoaPods overlay.
    fs.mkdirSync(path.dirname(aliasPath), { recursive: true });
    fs.copyFileSync(sourcePath, aliasPath);
  }
}

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

    if (name === 'React.xcframework') {
      materializeReactVirtualHeaders(path.join(destinationPath, 'Headers'));
      for (const slice of fs.readdirSync(destinationPath)) {
        const sliceHeadersPath = path.join(
          destinationPath,
          slice,
          'React.framework',
          'Headers'
        );

        materializeReactVirtualHeaders(sliceHeadersPath);
      }
    }

    logger.debug(`Copied ${colorLink(destinationPath)}`);
  }
}
