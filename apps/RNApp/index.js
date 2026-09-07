/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { heavyBundleChecksum } from './src/heavy';

globalThis.__heavyBundleChecksum = heavyBundleChecksum;

AppRegistry.registerComponent(appName, () => App);
