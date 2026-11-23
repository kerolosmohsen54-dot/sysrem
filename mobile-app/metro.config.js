const { realpathSync } = require('node:fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const physicalRoot = realpathSync.native(__dirname);
const config = physicalRoot === __dirname ? {} : { watchFolders: [physicalRoot] };

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
