import { isNavigationInstalled } from '../config.js';
import { isNavigationSpecPresent } from '../spec-discovery.js';
import { runNavigationCodegen } from '../runner.js';

export async function runNavigationCodegenIfApplicable(
  projectRoot: string,
  specPath?: string
): Promise<{ hasNavigation: boolean; hasSpec: boolean }> {
  const hasNavigation = isNavigationInstalled(projectRoot);
  const hasSpec = hasNavigation && isNavigationSpecPresent(specPath, projectRoot);

  if (hasSpec) {
    await runNavigationCodegen({ specPath, projectRoot });
  }

  return { hasNavigation, hasSpec };
}
