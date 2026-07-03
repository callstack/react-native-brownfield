import PostMessageTab from '../src/app/postMessage';
import Counter from '../src/components/counter';
import RNApp from '../RNApp';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
} from '@callstack/brownfield-example-shared-tests';

runPostMessageTabSuite('ExpoApp56', PostMessageTab);
runCounterSuite('ExpoApp56', Counter);
runExpoRnAppSuite('ExpoApp56', RNApp);
