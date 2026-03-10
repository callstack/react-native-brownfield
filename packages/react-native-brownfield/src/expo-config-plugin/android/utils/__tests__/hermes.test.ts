import { vi } from 'vitest';

import { getHermesArtifact } from '../hermes';
import { Logger } from '../../../logging';

// Mock Logger.logWarning to prevent console output during tests
vi.mock('../../logging', () => ({
  Logger: {
    logWarning: vi.fn(),
  },
}));

describe('getHermesArtifact', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct artifact for RN 0.84.0', () => {
    const artifact = getHermesArtifact('0.84.0');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.15.1',
    });
  });

  it('should return correct artifact for RN 0.85.0', () => {
    const artifact = getHermesArtifact('0.85.0');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.15.1',
    });
  });

  it('should return correct artifact for RN 0.83.0', () => {
    const artifact = getHermesArtifact('0.83.0');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.0',
    });
  });

  it('should return correct artifact for RN 0.83.1', () => {
    const artifact = getHermesArtifact('0.83.1');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.0',
    });
  });

  it('should return correct artifact for RN 0.83.2', () => {
    const artifact = getHermesArtifact('0.83.2');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.1',
    });
  });

  it('should return correct artifact for RN 0.83.4', () => {
    const artifact = getHermesArtifact('0.83.4');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.1',
    });
  });

  it('should return correct artifact for (inexistent) RN 0.83.1000000 and log a warning', () => {
    const artifact = getHermesArtifact('0.83.1000000');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.1',
    });
    expect(Logger.logWarning).toHaveBeenCalledTimes(1);
    expect(Logger.logWarning).toHaveBeenCalledWith(
      expect.stringContaining(
        `This React Native patch version '0.83.1000000' (in 0.83.1000000) has not been tested with the Brownfield plugin yet - please consider reporting this on GitHub: https://github.com/callstack/react-native-brownfield/. Using the latest version of Hermes that Brownfield has been tested with`
      )
    );
  });

  it('should return correct artifact for RN 0.82.0', () => {
    const artifact = getHermesArtifact('0.82.0');
    expect(artifact).toEqual({
      groupId: 'com.facebook.react',
      artifactId: 'hermes-android',
      version: '0.82.0',
    });
  });

  it('should return correct artifact for RN 0.73.0', () => {
    const artifact = getHermesArtifact('0.73.0');
    expect(artifact).toEqual({
      groupId: 'com.facebook.react',
      artifactId: 'hermes-android',
      version: '0.73.0',
    });
  });

  it('should handle pre-release versions for patch', () => {
    const artifact = getHermesArtifact('0.83.2-rc.0');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.1',
    });
  });

  it('should handle build metadata for patch', () => {
    const artifact = getHermesArtifact('0.83.2+build.1');
    expect(artifact).toEqual({
      groupId: 'com.facebook.hermes',
      artifactId: 'hermes-android',
      version: '0.14.1',
    });
  });

  it('should throw error for invalid RN version string (too few parts)', () => {
    expect(() => getHermesArtifact('0.84')).toThrow(
      "Failed to parse React Native version from '0.84' - resolved components are: 0.84.NaN"
    );
  });

  it('should throw error for invalid RN version string (non-numeric parts)', () => {
    expect(() => getHermesArtifact('0.84.x')).toThrow(
      "Failed to parse React Native version from '0.84.x' - resolved components are: 0.84.NaN"
    );
  });

  it('should throw error for unsupported major version', () => {
    expect(() => getHermesArtifact('1.0.0')).toThrow(
      "Unsupported React Native major version '1' in '1.0.0'"
    );
  });
});
