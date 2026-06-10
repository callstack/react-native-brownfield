import {
  runCounterSuite,
  runHomeScreenSuite,
} from '@callstack/brownfield-example-shared-tests';
import { HomeScreen } from '../src/HomeScreen';
import Counter from '../src/components/counter';
import { getRandomTheme } from '../src/utils';

const theme = getRandomTheme();

runHomeScreenSuite('RNApp', HomeScreen);
runCounterSuite('RNApp', Counter, { colors: theme });
