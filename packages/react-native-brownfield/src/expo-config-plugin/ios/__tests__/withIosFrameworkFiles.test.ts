import { describe, expect, it } from 'vitest';

import { getFrameworkSourceFiles } from '../withIosFrameworkFiles';
import type { ResolvedBrownfieldPluginIosConfig } from '../../types/ios/BrownfieldPluginIosConfig';

const iosConfig: ResolvedBrownfieldPluginIosConfig = {
  frameworkName: 'BrownfieldLib',
  bundleIdentifier: 'com.example.brownfield.framework',
  deploymentTarget: '15.0',
  frameworkVersion: '1',
  buildSettings: {},
};

describe('getFrameworkSourceFiles', () => {
  it('renders the framework interface with an explicit bundle identifier lookup', () => {
    const files = getFrameworkSourceFiles(iosConfig);
    const frameworkInterface = files.find(
      (file) => file.relativePath === 'BrownfieldLib.swift'
    );

    expect(frameworkInterface?.content).toContain(
      'Bundle(identifier: "com.example.brownfield.framework")'
    );
    expect(frameworkInterface?.content).toContain(
      'Bundle.allFrameworks.first { $0.bundleIdentifier == "com.example.brownfield.framework" }'
    );
    expect(frameworkInterface?.content).toContain(
      'Bundle(for: InternalClassForBundle.self)'
    );
    expect(frameworkInterface?.content).toContain(
      'extension ReactNativeBrownfield'
    );
    expect(frameworkInterface?.content).not.toContain('{{BUNDLE_IDENTIFIER}}');
  });

  it('renders the Expo interface with the bundle identifier when the Expo host is requested explicitly', () => {
    const files = getFrameworkSourceFiles(iosConfig, { useExpoHost: true });
    const frameworkInterface = files.find(
      (file) => file.relativePath === 'BrownfieldLib.swift'
    );

    expect(frameworkInterface?.content).toBe(
      getFrameworkSourceFiles(iosConfig)[0].content
    );
  });

  it('renders the vanilla framework interface without bundle identifier lookups for non-Expo hosts', () => {
    const files = getFrameworkSourceFiles(iosConfig, { useExpoHost: false });
    const frameworkInterface = files.find(
      (file) => file.relativePath === 'BrownfieldLib.swift'
    );

    expect(frameworkInterface?.content).toContain(
      'public let ReactNativeBundle = Bundle(for: InternalClassForBundle.self)'
    );
    expect(frameworkInterface?.content).toContain(
      'class InternalClassForBundle {}'
    );

    // Vanilla frameworks cannot resolve an Expo bundle, so neither the
    // identifier lookups nor the Expo modules provider may be emitted.
    expect(frameworkInterface?.content).not.toContain(
      iosConfig.bundleIdentifier
    );
    expect(frameworkInterface?.content).not.toContain('{{BUNDLE_IDENTIFIER}}');
    expect(frameworkInterface?.content).not.toContain('Bundle(identifier:');
    expect(frameworkInterface?.content).not.toContain('ReactBrownfield');
    expect(frameworkInterface?.content).not.toContain('ExpoModulesProvider');
  });

  it('keeps the Info.plist bundle identifier for vanilla hosts', () => {
    const files = getFrameworkSourceFiles(iosConfig, { useExpoHost: false });
    const infoPlist = files.find((file) => file.relativePath === 'Info.plist');

    expect(infoPlist?.content).toContain(iosConfig.bundleIdentifier);
    expect(infoPlist?.content).not.toContain('{{BUNDLE_IDENTIFIER}}');
  });
});
