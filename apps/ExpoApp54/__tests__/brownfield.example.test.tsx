import PostMessageTab from '../app/(tabs)/postMessage';
import Counter from '../components/counter';
import RNApp from '../RNApp';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
} from '@callstack/brownfield-example-shared-tests';

runPostMessageTabSuite('ExpoApp54', PostMessageTab);
runCounterSuite('ExpoApp54', Counter);
runExpoRnAppSuite('ExpoApp54', RNApp);
