import { isNavigationInstalled } from '../config.js';
import { isNavigationSpecPresent } from '../spec-discovery.js';
import { runNavigationCodegen } from '../runner.js';

export function runNavigationCodegenIfApplicable(
  projectRoot: string,
  specPath?: string
): { hasNavigation: boolean; hasSpec: boolean } {
  const hasNavigation = isNavigationInstalled(projectRoot);
  const hasSpec = hasNavigation && isNavigationSpecPresent(specPath, projectRoot);

  if (hasSpec) {
    runNavigationCodegen({ specPath, projectRoot });
  }

  return { hasNavigation, hasSpec };
}
