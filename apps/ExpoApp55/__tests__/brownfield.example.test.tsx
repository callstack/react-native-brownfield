import PostMessageTab from '../src/app/postMessage';
import Counter from '../src/components/counter';
import RNApp from '../RNApp';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
  runUserAlertSuite,
} from '@callstack/brownfield-example-shared-tests';

runPostMessageTabSuite('ExpoApp55', PostMessageTab);
runCounterSuite('ExpoApp55', Counter);
runExpoRnAppSuite('ExpoApp55', RNApp);
runUserAlertSuite('ExpoApp55');
