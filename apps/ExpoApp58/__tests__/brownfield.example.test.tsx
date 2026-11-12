import { runUserAlertSuite } from '@callstack/shared-tests';
import PostMessageTab from '../src/app/postMessage';
import Counter from '@callstack/shared-runtime/counter';
import RNApp from '../RNApp';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
} from '@callstack/shared-tests';

runPostMessageTabSuite('ExpoApp58', PostMessageTab);
runCounterSuite('ExpoApp58', Counter);
runExpoRnAppSuite('ExpoApp58', RNApp, 58);

runUserAlertSuite('ExpoApp58');
