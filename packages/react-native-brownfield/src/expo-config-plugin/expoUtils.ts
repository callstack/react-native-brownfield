import type { ExpoConfig } from '@expo/config-types';

export function getExpoInfo(config: ExpoConfig) {
  const expoMajor = config.sdkVersion
    ? parseInt(config.sdkVersion.split('.')[0], 10)
    : -1;
  const isExpoPre55 = expoMajor < 55;
  return {
    expoMajor,
    isExpoPre55,
  };
}
