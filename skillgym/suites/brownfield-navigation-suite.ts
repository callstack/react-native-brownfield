import type { SuiteWorkspaceConfig, TestSuite } from "skillgym";
import { assert } from "skillgym";

export const workspace: SuiteWorkspaceConfig = {
  mode: "isolated",
  templateDir: "../template/skillgym-app",
  bootstrap: {
    command: "yarn",
    args: ["install"],
    timeoutMs: 120_000,
  },
};

const brownfieldNavigationSuite = [
    {
    id: "navigation-setup",
    prompt:
      "Setup brownfield navigation with navigate to profile method. DO NOT read/scan files under packages/** and apps/** OR node_modules/**.",
    assert(report) {
      assert.fileReads.includes(report, /skills\/brownfield-navigation\/references\/setup-codegen\.md$/);
      assert.commands.includes(report, /npx brownfield navigation:codegen/i);
      assert.output.includes(report, /navigateToProfile/i);
    },
  },
  {
    id: "navigation-native-wiring",
    prompt: "How do I use the generated brownfield navigation on the native android app to complete the wiring?",
    assert(report) {
      assert.fileReads.includes(report, /skills\/brownfield-navigation\/references\/native-integration\.md$/);
      assert.output.includes(report, /BrownfieldNavigationDelegate/i);
      assert.output.includes(
        report,
        /BrownfieldNavigationManager\.setDelegate|shared\.setDelegate/i
      );
    },
  },
] satisfies TestSuite;

export default brownfieldNavigationSuite;
