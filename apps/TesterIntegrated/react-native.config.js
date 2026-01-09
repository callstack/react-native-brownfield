const path = require('path');
const brownfieldPkg = require('../../packages/react-native-brownfield/package.json');
const browniePkg = require('../../packages/brownie/package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
    android: {
      sourceDir: './kotlin',
    },
  },
  dependencies: {
    [brownfieldPkg.name]: {
      root: path.join(__dirname, '../../packages/react-native-brownfield'),
      platforms: {
        ios: {},
        android: {},
      },
    },
    [browniePkg.name]: {
      root: path.join(__dirname, '../../packages/brownie'),
      platforms: {
        ios: {},
        android: null,
      },
    },
  },
};
