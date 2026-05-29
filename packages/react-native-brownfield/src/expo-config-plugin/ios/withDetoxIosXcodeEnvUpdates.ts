import fs from 'node:fs';
import path from 'node:path';

import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';

const XCODE_ENV_UPDATES_MARKER =
  '# @callstack/react-native-brownfield: Detox / CI embedded bundle';

const XCODE_ENV_UPDATES = `${XCODE_ENV_UPDATES_MARKER}
# When FORCE_BUNDLING=1 (see apps/*/.detoxrc.cjs), embed JS for simulator E2E without Metro.
if [[ -n "$FORCE_BUNDLING" ]]; then
  unset SKIP_BUNDLING
fi
`;

/**
 * Expo Debug builds set SKIP_BUNDLING=1 on the app target; Detox passes FORCE_BUNDLING=1
 * and relies on ios/.xcode.env.updates (sourced by the bundle script) to unset it.
 */
export const withDetoxIosXcodeEnvUpdates: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (configWithMods) => {
      const filePath = path.join(
        configWithMods.modRequest.platformProjectRoot,
        '.xcode.env.updates'
      );

      if (
        fs.existsSync(filePath) &&
        fs.readFileSync(filePath, 'utf8').includes(XCODE_ENV_UPDATES_MARKER)
      ) {
        return configWithMods;
      }

      fs.writeFileSync(filePath, XCODE_ENV_UPDATES);
      return configWithMods;
    },
  ]);
};
