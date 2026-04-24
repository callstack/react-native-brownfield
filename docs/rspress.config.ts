import { withCallstackPreset } from '@callstack/rspress-preset';

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      title: 'React Native Brownfield',
      description: 'React Native Brownfield Documentation',
      editUrl:
        'https://github.com/callstack/react-native-brownfield/tree/main/docs',
      icon: '/logo.svg',
      logoLight: '/logo-light.svg',
      logoDark: '/logo-dark.svg',
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
