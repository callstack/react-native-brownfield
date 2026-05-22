import { withAppDelegate, type ConfigPlugin } from '@expo/config-plugins';

const REGISTRATION_MARKER =
  '// @callstack/react-native-brownfield: Brownie default store registration';

/**
 * Registers the default `BrownfieldStore` in AppDelegate before `startReactNative`,
 * matching the bare RN brownfield pattern (see demo AppDelegate).
 *
 * Requires Brownie Swift codegen (`brownfield codegen`) so `BrownfieldStore` exists in the Brownie pod.
 */
export const withBrownieIosAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (configWithMods) => {
    const { modResults } = configWithMods;

    if (modResults.language !== 'swift') {
      return configWithMods;
    }

    let { contents } = modResults;

    if (contents.includes(REGISTRATION_MARKER)) {
      return configWithMods;
    }

    if (!contents.includes('import Brownie')) {
      contents = `import Brownie\n${contents}`;
    }

    const needle = 'factory.startReactNative(';
    if (!contents.includes(needle)) {
      return configWithMods;
    }

    contents = contents.replace(
      needle,
      `${REGISTRATION_MARKER}
    let brownfieldInitialState = BrownfieldStore(
      counter: 0,
      user: User(name: "Username")
    )
    BrownfieldStore.register(brownfieldInitialState)

    factory.startReactNative(`
    );

    modResults.contents = contents;
    return configWithMods;
  });
};
