const path = require('node:path');
const pkg = require('../../packages/react-native-brownfield/package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '../../packages/react-native-brownfield'),
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
};
