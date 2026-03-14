import { styleText } from 'node:util';
import {
  packageAndroidCommand,
  packageAndroidExample,
} from './commands/packageAndroid.js';
import {
  publishAndroidCommand,
  publishAndroidExample,
} from './commands/publishAndroid.js';
import { packageIosCommand, packageIosExample } from './commands/packageIos.js';

export const groupName = `${styleText(['bold', 'blueBright'], '@callstack/react-native-brownfield')}${styleText('whiteBright', ' - utilities for React Native Brownfield projects')}`;

export const Commands = {
  packageAndroidCommand,
  packageAndroidExample,
  publishAndroidCommand,
  publishAndroidExample,
  packageIosCommand,
  packageIosExample,
};
export default Commands;
