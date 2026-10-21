import { runUserAlertSuite } from '@callstack/shared-tests';
import PostMessageTab from '../src/app/postMessage';
import Counter from '@callstack/shared-runtime/counter';
import RNApp from '../RNApp';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
} from '@callstack/shared-tests';

runPostMessageTabSuite('ExpoApp57', PostMessageTab);
runCounterSuite('ExpoApp57', Counter);
runExpoRnAppSuite('ExpoApp57', RNApp, 57);

runUserAlertSuite('ExpoApp57');
