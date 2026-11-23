const fs = require('fs');
const path = require('path');

const useShortRoot = process.env.ERP_ANDROID_SHORT_ROOT === '1';
const shortRoot = path.resolve(__dirname, '..');
const packageRoot = (name, shortName = name) => {
  const alias = path.join(shortRoot, shortName);
  return useShortRoot && fs.existsSync(alias)
    ? alias
    : path.join(__dirname, 'node_modules', ...name.split('/'));
};

module.exports = {
  dependencies: {
    'react-native-gesture-handler': { root: packageRoot('react-native-gesture-handler', 'g') },
    'react-native-safe-area-context': { root: packageRoot('react-native-safe-area-context', 'a') },
    'react-native-screens': { root: packageRoot('react-native-screens', 's') },
    'react-native-keychain': { root: packageRoot('react-native-keychain', 'k') },
    '@react-native-community/netinfo': { root: packageRoot('@react-native-community/netinfo', 'n') },
  },
};
