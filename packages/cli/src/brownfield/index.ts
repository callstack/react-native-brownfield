import { styleText } from 'node:util';

import * as Commands from './commands/index.js';

export * from './utils/index.js';

export const groupName = `${styleText(['bold', 'blueBright'], '@callstack/react-native-brownfield')}${styleText('whiteBright', ' - utilities for React Native Brownfield projects')}`;

export { Commands };
export default Commands;
