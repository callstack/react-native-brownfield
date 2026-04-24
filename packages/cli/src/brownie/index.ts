import { styleText } from 'node:util';

import * as Commands from './commands/index.js';

export type * from './types.js';
export * from './store-discovery.js';

export const groupName = `${styleText(['bold', 'blueBright'], '@callstack/brownie')}${styleText('whiteBright', ' - Shared state management CLI for React Native Brownfield')}`;

export { Commands };
export default Commands;
