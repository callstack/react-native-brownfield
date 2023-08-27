const root = process.cwd();

module.exports = {
  dependencies: {
    'react-native-brownfield': {
      root: __dirname,
    },
  },
  project: {
    ios: {
      sourceDir: `./example/${root.includes('swift') ? 'swift' : 'objc'}`,
    },
  },
};
