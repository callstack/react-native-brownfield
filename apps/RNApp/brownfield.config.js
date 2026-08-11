/**
 * @type {import('@callstack/react-native-brownfield').BrownfieldConfig}
 */
module.exports = {
  android: {
    moduleName: ':BrownfieldLib',
    variant: 'devRelease',
  },
  ios: {
    scheme: 'BrownfieldLib',
  },
  verbose: true,
};
