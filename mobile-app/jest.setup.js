const { jest } = require('@jest/globals');
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: 'View' }));
jest.mock('@react-navigation/native', () => ({ NavigationContainer: 'View' }));
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({ Navigator: 'View', Screen: 'View' }),
}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'unlocked' },
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));
jest.mock('react-native-nitro-sqlite', () => ({
  open: jest.fn(() => ({ executeAsync: jest.fn().mockResolvedValue({ rows: { _array: [] } }) })),
}));
jest.mock('react-native-biometrics', () => jest.fn().mockImplementation(() => ({
  isSensorAvailable: jest.fn().mockResolvedValue({ available: false }),
  simplePrompt: jest.fn().mockResolvedValue({ success: true }),
})));
