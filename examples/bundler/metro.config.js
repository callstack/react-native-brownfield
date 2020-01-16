const path = require('path');

module.exports = {
  projectRoot: path.resolve('.'),
  watchFolders: [
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../../packages/bridge'),
    path.resolve(__dirname, '../../packages/cli'),
  ],
};
