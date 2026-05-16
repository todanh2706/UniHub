const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withCameraMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    const mavenRepoStr = `maven { url "$rootDir/../node_modules/expo-camera/android/maven" }`;
    const jcenterStr = `jcenter()`;
    
    if (!buildGradle.includes('expo-camera/android/maven')) {
      buildGradle = buildGradle.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        `allprojects {\n    repositories {\n        ${mavenRepoStr}\n        ${jcenterStr}`
      );
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });
};
