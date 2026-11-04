/**
 * @format
 */
import './BrownfieldStore.brownie';

import { App } from '@callstack/brownfield-example-shared';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
