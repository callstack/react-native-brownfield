import type { SessionReport, Suite } from 'skillgym';
import { assert } from 'skillgym';
import {
  assertEvidence,
  assertNoProjectSourceReads,
  buildPrompt,
} from './shared.ts';

const brownieSuite: Suite = [
  {
    id: 'brownie-ios-wiring',
    prompt: buildPrompt({
      task: 'How do I use the generated brownie on the native iOS app to complete the wiring?',
    }),
    assert(report: SessionReport) {
      assertEvidence(report, 'brownie');
      assertNoProjectSourceReads(report);

      assert.soft.match(
        report.finalOutput,
        /YourStore\.register\(initialState\)/
      );
      assert.soft.match(report.finalOutput, /@UseStore/);
    },
  },
  {
    id: 'brownie-android-wiring',
    prompt: buildPrompt({
      task: 'How do I use the generated brownie on the native android app to complete the wiring?',
    }),
    assert(report: SessionReport) {
      assertEvidence(report, 'brownie');
      assertNoProjectSourceReads(report);

      assert.soft.match(report.finalOutput, /registerStoreIfNeeded/);
    },
  },
];

export default brownieSuite;
