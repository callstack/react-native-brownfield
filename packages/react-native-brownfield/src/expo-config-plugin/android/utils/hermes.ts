import { Logger } from '../../logging';

export function getHermesArtifact(rnVersion: string) {
  let [rnMajorVersionString, rnMinorVersionString, rnPatchVersionString] =
    rnVersion.split('.') as [string?, string?, string?];

  const rnMajorVersion = Number(rnMajorVersionString);
  const rnMinorVersion = Number(rnMinorVersionString);

  if (
    rnPatchVersionString?.includes('-') ||
    rnPatchVersionString?.includes('+')
  ) {
    rnPatchVersionString = rnPatchVersionString.split('-')[0].split('+')[0];
  }

  const rnPatchVersion = Number(rnPatchVersionString);

  if (
    Number.isNaN(rnMajorVersion) ||
    Number.isNaN(rnMinorVersion) ||
    Number.isNaN(rnPatchVersion)
  ) {
    throw new Error(
      `Failed to parse React Native version from '${rnVersion}' - resolved components are: ${rnMajorVersion}.${rnMinorVersion}.${rnPatchVersion}`
    );
  }

  if (rnMajorVersion !== 0) {
    throw new Error(
      `Unsupported React Native major version '${rnMajorVersion}' in '${rnVersion}'`
    );
  }

  // below: 0.84.x
  if (rnMinorVersion >= 84) {
    return {
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.15.1',
    };
  }

  // below: 0.83.x
  if (rnMinorVersion === 83) {
    let version: string;

    switch (rnPatchVersion) {
      // below: 0.83.0, 0.83.1
      case 0:
      case 1:
        version = '0.14.0';
        break;

      // below: 0.83.2, 0.83.3, 0.83.4
      case 2:
      case 3:
      case 4:
        version = '0.14.1';
        break;

      default:
        version = '0.14.1';
        Logger.logWarning(
          `This React Native patch version '${rnVersion}' (in ${rnMajorVersion}.${rnMinorVersion}.${rnPatchVersion}) has not been tested with the Brownfield plugin yet - please consider reporting this on GitHub: https://github.com/callstack/react-native-brownfield/. Using the latest version of Hermes that Brownfield has been tested with (0.14.1).`
        );
        break;
    }

    return {
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version,
    };
  }

  // below: 0.82.x and below
  return {
    groupId: 'com.facebook.react',
    artifactId: 'hermes-android',
    version: rnVersion,
  };
}
