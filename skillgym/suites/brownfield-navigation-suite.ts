import type { SessionReport, Suite } from 'skillgym';
import { assert } from 'skillgym';
import {
  assertEvidence,
  assertNoProjectSourceReads,
  buildPrompt,
} from './shared.ts';

const brownfieldNavigationSuite: Suite = [
  {
    id: 'navigation-ios-wiring',
    prompt: buildPrompt({
      task: 'How do I use the generated brownfield navigation on the native iOS app to complete the wiring?',
    }),
    assert(report: SessionReport) {
      assertEvidence(report, 'brownfield-navigation');
      assertNoProjectSourceReads(report);

      assert.soft.match(report.finalOutput, /BrownfieldNavigationDelegate/i);
      assert.soft.match(
        report.finalOutput,
        /BrownfieldNavigationManager\.shared\.setDelegate/i
      );
    },
  },
  {
    id: 'navigation-android-wiring',
    prompt: buildPrompt({
      task: 'How do I use the generated brownfield navigation on the native android app to complete the wiring?',
    }),
    assert(report: SessionReport) {
      assertEvidence(report, 'brownfield-navigation');
      assertNoProjectSourceReads(report);

      assert.soft.match(report.finalOutput, /BrownfieldNavigationDelegate/i);
      assert.soft.match(
        report.finalOutput,
        /BrownfieldNavigationManager\.setDelegate/i
      );
    },
  },
];

export default brownfieldNavigationSuite;
