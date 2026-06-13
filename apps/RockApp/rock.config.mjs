import { platformAndroid } from '@rock-js/platform-android';
import { platformIOS } from '@rock-js/platform-ios';
import { pluginBrownfieldAndroid } from '@rock-js/plugin-brownfield-android';
import { pluginBrownfieldIos } from '@rock-js/plugin-brownfield-ios';
import { pluginMetro } from '@rock-js/plugin-metro';

export default {
  plugins: [pluginBrownfieldIos(), pluginBrownfieldAndroid()],
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS(),
    android: platformAndroid(),
  },
};
