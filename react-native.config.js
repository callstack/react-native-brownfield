module.exports = {
  dependencies: {
    'react-native-brownfield': {
      root: __dirname,
    },
  },
  project: {
    ios: {
      sourceDir: './example/swift',
    },
    android: {
      sourceDir: './example/kotlin',
    }
  },
};
