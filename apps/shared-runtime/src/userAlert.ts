import { Alert } from 'react-native';

let brownfieldE2EMode = false;

export function setBrownfieldE2EMode(enabled: boolean) {
  brownfieldE2EMode = enabled;
}

export function isBrownfieldE2EMode() {
  return brownfieldE2EMode;
}

export type BrownfieldRootProps = {
  nativeOsVersionLabel?: string;
  brownfieldE2E?: boolean;
};

export function syncBrownfieldE2EModeFromRootProps(brownfieldE2E?: boolean) {
  setBrownfieldE2EMode(brownfieldE2E ?? false);
}

export function userAlert(title: string, message?: string) {
  if (brownfieldE2EMode) {
    console.log(
      `[userAlert] ${title}${message !== undefined ? `: ${message}` : ''}`
    );
    return;
  }

  if (message !== undefined) {
    Alert.alert(title, message);
  } else {
    Alert.alert(title);
  }
}
