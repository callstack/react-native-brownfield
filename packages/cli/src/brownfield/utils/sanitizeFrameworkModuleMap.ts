import fs from 'node:fs';
import path from 'node:path';

export function sanitizeFrameworkModuleMap(
  frameworkDir: string,
  frameworkName: string
): void {
  const moduleMapPath = path.join(frameworkDir, 'Modules', 'module.modulemap');

  if (!fs.existsSync(moduleMapPath)) {
    return;
  }

  let moduleMap = fs.readFileSync(moduleMapPath, 'utf8');

  moduleMap = moduleMap.replace(
    new RegExp(`^module\\s+${frameworkName}\\s+\\{`, 'm'),
    `framework module ${frameworkName} {`
  );
  moduleMap = moduleMap.replace(
    new RegExp(`umbrella header "${frameworkName}-umbrella\\.h"`, 'g'),
    `umbrella header "../Headers/${frameworkName}-umbrella.h"`
  );
  moduleMap = moduleMap.replace(
    new RegExp(
      `header\\s+".*?/Swift Compatibility Header/${frameworkName}-Swift\\.h"`,
      'g'
    ),
    `header "../Headers/${frameworkName}-Swift.h"`
  );
  moduleMap = moduleMap.replace(
    new RegExp(`header "${frameworkName}-Swift\\.h"`, 'g'),
    `header "../Headers/${frameworkName}-Swift.h"`
  );

  fs.writeFileSync(moduleMapPath, moduleMap);
}
