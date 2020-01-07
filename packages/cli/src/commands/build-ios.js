const fs = require('fs');
const execSync = require('child_process').execSync;

module.exports = function buildArtifact({entryFile}) {
  const buildDir = `${__dirname}/../../build`;

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  try {
    const result = execSync(
      `react-native bundle --platform ios --dev false --entry-file ${entryFile} --bundle-output ${buildDir}/main.jsbundle --assets-dest ${buildDir}`,
    );
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }

  try {
    const result = execSync(
      'xcodebuild -workspace ReactNativeBrownfield.xcworkspace -scheme ReactNativeBrownfield -sdk iphoneos -derivedDataPath build',
    );
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }
};
