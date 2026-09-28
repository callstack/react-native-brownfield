import PostMessageTab from '../src/app/postMessage';
import Counter from '../src/components/counter';
import RNApp from '../RNApp';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
} from '@callstack/brownfield-example-shared-tests';

runPostMessageTabSuite('ExpoApp58', PostMessageTab);
runCounterSuite('ExpoApp58', Counter);
runExpoRnAppSuite('ExpoApp58', RNApp);
