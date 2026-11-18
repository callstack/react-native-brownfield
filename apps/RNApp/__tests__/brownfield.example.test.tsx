import {
  runCounterSuite,
  runHomeScreenSuite,
} from '@callstack/brownfield-example-shared-tests';
import {
  Counter,
  getRandomTheme,
  HomeScreen,
} from '@callstack/brownfield-example-shared';

const theme = getRandomTheme();

runHomeScreenSuite('RNApp', HomeScreen);
runCounterSuite('RNApp', Counter, { colors: theme });
