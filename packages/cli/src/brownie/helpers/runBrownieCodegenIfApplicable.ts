import { runCodegen } from '../commands/codegen.js';
import { isBrownieInstalled } from '../config.js';

import type { Platform } from '../types.js';

export async function runBrownieCodegenIfApplicable(
  projectRoot: string,
  platform: Platform
) {
  const hasBrownie = isBrownieInstalled(projectRoot);
  if (hasBrownie) {
    await runCodegen({ platform });
  }

  return { hasBrownie };
}
