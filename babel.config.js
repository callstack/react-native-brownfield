module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@callstack/react-native-brownfield': './src',
        },
      },
    ],
  ],
};
