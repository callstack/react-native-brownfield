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

runHomeScreenSuite('RockApp', HomeScreen);
runCounterSuite('RockApp', Counter, { colors: theme });
