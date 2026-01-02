import { withCallstackPreset } from '@callstack/rspress-preset';

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      title: 'React Native Brownfield',
      description: 'React Native Brownfield Documentation',
      editUrl:
        'https://github.com/callstack/react-native-brownfield/tree/main/docs',
      icon: '/img/tractor.png',
      logoLight: '/img/tractor.png',
      logoDark: '/img/tractor.png',
      rootDir: 'docs',
      rootUrl: 'https://callstack.github.io/react-native-brownfield/',
      socials: {
        github: 'https://github.com/callstack/react-native-brownfield',
      },
    },
  },
  {
    base: '/react-native-brownfield/',
  }
);
