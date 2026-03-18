const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
  projectRoot: path.resolve(__dirname),
  resolver: {
    blockList: [
      /api\/.*/,
      /api\\.*/, // Windows path
    ],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
  },
  watchFolders: [path.resolve(__dirname)],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
