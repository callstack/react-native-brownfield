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
  });
});
