import { isNavigationInstalled } from '../config.js';
import { isNavigationSpecPresent } from '../spec-discovery.js';
import { runNavigationCodegen } from '../runner.js';

interface RunNavigationCodegenIfApplicableOptions {
  specPath?: string;
  outputDir?: string;
}

export async function runNavigationCodegenIfApplicable(
  projectRoot: string,
  { specPath, outputDir }: RunNavigationCodegenIfApplicableOptions = {}
): Promise<{ hasNavigation: boolean; hasSpec: boolean }> {
  const hasNavigation = isNavigationInstalled(projectRoot);
  const hasSpec = hasNavigation && isNavigationSpecPresent(specPath, projectRoot);

  if (hasSpec) {
    await runNavigationCodegen({ specPath, projectRoot, outputDir });
  }

  return { hasNavigation, hasSpec };
}
