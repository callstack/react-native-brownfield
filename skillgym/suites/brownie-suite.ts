import type { SuiteWorkspaceConfig, TestSuite } from 'skillgym';
import { assert } from 'skillgym';

export const workspace: SuiteWorkspaceConfig = {
  mode: 'isolated',
  templateDir: '../template/skillgym-app',
  bootstrap: {
    command: 'yarn',
    args: ['install'],
    timeoutMs: 120_000,
  },
};

const brownieSuite = [
  {
    id: 'brownie-setup',
    prompt:
      "Setup brownie with a new store called `user` and a method to get the user's name. Run the codegen to ensure native files are generated. Do not read files under packages/** and apps/**",
    assert(report) {
      assert.fileReads.includes(
        report,
        /brownie\/references\/getting-started\.md$/
      );
      assert.commands.includes(report, /npx brownfield codegen/i);
    },
  },
  {
    id: 'brownie-native-wiring',
    prompt:
      'How do I use the generated brownie on the native android app to complete the wiring?',
    assert(report) {
      assert.fileReads.includes(
        report,
        /brownie\/references\/android-usage\.md$/
      );
      assert.output.includes(report, /registerStoreIfNeeded/i);
    },
  },
] satisfies TestSuite;

export default brownieSuite;
