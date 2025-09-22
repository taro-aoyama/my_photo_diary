/**
 * jest.setup.js
 *
 * Jest setup for my_photo_diary
 * - Extends matchers from @testing-library/jest-native
 * - Provides lightweight mocks for native/expo modules commonly used in the app
 * - Prevents common React Native warnings during tests
 *
 * Note: This file is loaded via jest.config.js `setupFilesAfterEnv`.
 */

//
// Testing library matchers
//
require('@testing-library/jest-native/extend-expect');

// Increase default timeout for slower CI environments or device-related mocks
jest.setTimeout(10000);

//
// Silence the warning: Animated: `useNativeDriver` is not supported
//
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

//
// react-native-reanimated (v2+) mock
// Use the official mock which provides basic hooks/stubs used by components.
// Ensure this is before any imports that might load reanimated.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line global-require
  const Reanimated = require('react-native-reanimated/mock');

  // Reanimated mock workaround for jest: set up default export and __esModule flag
  Reanimated.default = Reanimated;
  Reanimated.__esModule = true;

  // optional: override some methods if tests need specific behavior
  Reanimated.useSharedValue = (init) => ({ value: init });
  Reanimated.useAnimatedStyle = (fn) => fn();
  Reanimated.withTiming = (v) => v;
  Reanimated.withDelay = (t, v) => v;

  return Reanimated;
});

//
// react-native-gesture-handler minimal mock
//
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    // Basic components used in many apps
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    Directions: {},
    GestureHandlerRootView: View,
    ScrollView: View,
    TouchableOpacity: require('react-native').TouchableOpacity,
    // If your code imports specific gesture handlers, mock them as simple components:
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    LongPressGestureHandler: View,
  };
});

//
// Lightweight mocks for Expo modules used during tests.
// These provide simple implementations so tests don't crash when native module behavior isn't needed.
//

// expo-file-system
jest.mock('expo-file-system', () => {
  return {
    documentDirectory: 'file://mocked-docs/',
    cacheDirectory: 'file://mocked-cache/',
    getInfoAsync: jest.fn(async (uri) => ({ exists: false, uri })),
    makeDirectoryAsync: jest.fn(async (path) => ({ path })),
    copyAsync: jest.fn(async ({ from, to }) => ({ from, to, uri: to })),
    moveAsync: jest.fn(async ({ from, to }) => ({ from, to, uri: to })),
    deleteAsync: jest.fn(async (uri, options) => ({ uri, deleted: true })),
    downloadAsync: jest.fn(async (url, fileUri) => ({ uri: fileUri })),
  };
});

// expo-image-manipulator
jest.mock('expo-image-manipulator', () => {
  return {
    manipulateAsync: jest.fn(async (uri, actions = [], options = {}) => {
      // Return an object similar to the real API
      return { uri, width: 100, height: 100, base64: null };
    }),
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  };
});

// expo-image-picker
jest.mock('expo-image-picker', () => {
  return {
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
    launchCameraAsync: jest.fn(async () => ({ canceled: true })),
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  };
});

// expo-media-library
jest.mock('expo-media-library', () => {
  return {
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    createAssetAsync: jest.fn(async (uri) => ({ id: 'asset-mock-id', uri })),
    getAssetsAsync: jest.fn(async () => ({ assets: [] })),
  };
});

// expo-sqlite: provide a minimal in-memory-like mock that supports transactions and executeSql
jest.mock('expo-sqlite', () => {
  // Very small shim that satisfies usage in tests (returns empty result sets).
  const openDatabase = (name) => {
    return {
      _name: name,
      transaction: (fn) => {
        // Create a fake tx with executeSql that calls the success callback with empty rows
        const tx = {
          executeSql: (sql, params = [], success) => {
            const result = {
              rows: {
                _array: [],
                item: () => null,
                length: 0,
              },
              insertId: 1,
              rowsAffected: 0,
            };
            if (typeof success === 'function') {
              success(tx, result);
            }
            return result;
          },
        };
        try {
          fn(tx);
        } catch (e) {
          // no-op
        }
      },
    };
  };
  return { openDatabase };
});

//
// Mock fetch if code expects global.fetch; jest-expo typically provides it, but ensure fallback
//
if (typeof global.fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

//
// Optional: helper to flush pending promises in tests
//
global.flushPromises = () => new Promise((resolve) => setImmediate(resolve));

//
// Provide a small console filter to reduce noise during tests (optional)
//
const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  // Filter known noisy RN warning fragments here if desired
  const msg = String(args[0] || '');
  if (msg.includes('Setting a timer') || msg.includes('Animated: `useNativeDriver`')) {
    return;
  }
  originalWarn(...args);
};
