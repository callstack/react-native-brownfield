import * as generated from './generated';

/**
 * Pull generated payloads into the main bundle and walk them at import time
 * so Hermes has to parse and execute the extra modules.
 */
let checksum = 0;

for (const value of Object.values(generated)) {
  if (!Array.isArray(value)) {
    continue;
  }

  for (let i = 0; i < value.length; i += 1) {
    const row = value[i];
    checksum = (checksum + row.length * (i + 1)) | 0;
  }
}

export const heavyBundleChecksum = checksum;
