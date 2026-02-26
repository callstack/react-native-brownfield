import { styleText } from 'node:util';

import * as Commands from './commands/index.js';

export const groupName = `${styleText(['bold', 'blueBright'], '@callstack/brownfield-navigation')}${styleText('whiteBright', ' - native codegen utilities for Brownfield Navigation')}`;

export { Commands };
export type * from './types.js';
export * from './runner.js';
export default Commands;
