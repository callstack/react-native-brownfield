import path from 'node:path';
import { createRequire } from 'node:module';

export const NAVIGATION_PACKAGE_NAME = '@callstack/brownfield-navigation';
export const DEFAULT_SPEC_FILENAME = 'brownfield.navigation.ts';
export const DEFAULT_ANDROID_JAVA_PACKAGE =
  'com.callstack.nativebrownfieldnavigation';

export function isNavigationInstalled(
  projectRoot: string = process.cwd()
): boolean {
  const require = createRequire(path.join(projectRoot, 'package.json'));
  try {
    require.resolve(`${NAVIGATION_PACKAGE_NAME}/package.json`);
    return true;
  } catch {
    return false;
  }
}

export function getNavigationPackagePath(
  projectRoot: string = process.cwd()
): string {
  const require = createRequire(path.join(projectRoot, 'package.json'));
  try {
    const packageJsonPath = require.resolve(
      `${NAVIGATION_PACKAGE_NAME}/package.json`
    );
    return path.dirname(packageJsonPath);
  } catch {
    throw new Error(
      `${NAVIGATION_PACKAGE_NAME} is not installed. Run 'npm install ${NAVIGATION_PACKAGE_NAME}' or 'yarn add ${NAVIGATION_PACKAGE_NAME}'`
    );
  }
}
