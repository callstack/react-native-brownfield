module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
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
