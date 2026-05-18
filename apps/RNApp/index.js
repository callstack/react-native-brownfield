/**
 * @format
 */

import './BrownfieldStore.brownie';

import { AppRegistry } from 'react-native';
import { App } from '@callstack/brownfield-example-shared';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
