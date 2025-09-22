/**
 * jest.config.js
 *
 * Jest configuration for my_photo_diary (Expo + React Native + TypeScript)
 *
 * Notes:
 * - This configuration uses `babel-jest` (via the `jest-expo` preset) to transform JS/TS files.
 * - It includes common React Native transform ignore patterns so node_modules with native code are handled.
 * - It references a `jest.setup.js` and `@testing-library/jest-native` for DOM/React Native assertions.
 * - Ensure you have `jest`, `babel-jest`, `jest-expo`, `@testing-library/react-native`, and
 *   `@testing-library/jest-native` installed as devDependencies.
 *
 * If you need to run tests in CI, adapt NODE_ENV or testTimeout as necessary.
 */

module.exports = {
  // Use the Expo preset for a smooth React Native + Expo Jest configuration.
  // If you prefer a custom Babel/Jest setup, replace this preset and adjust transforms below.
  preset: 'jest-expo',

  // Root of the project
  rootDir: '.',

  // Extensions Jest will look for
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Common module name mappings for assets and styles
  moduleNameMapper: {
    // Mock static assets (images, fonts, etc.)
    '\\.(jpg|jpeg|png|gif|svg|webp|avif)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Where to look for tests
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  // Ignore these paths when running tests
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Setup files to run before the test framework is installed in the environment.
  // Use jest.setup.js to set up global mocks, fetch, or other test helpers.
  setupFilesAfterEnv: [
    // Add matchers from jest-native (if installed)
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js'
  ],

  // Use babel-jest for transforming source files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },

  // Some node_modules contain ES modules or native code that need to be transformed,
  // so we whitelist common RN/Expo packages. Add additional packages if your tests
  // fail complaining about unexpected token from node_modules.
  transformIgnorePatterns: [
    // This pattern means "don't transform anything in node_modules except for the following packages"
    // It's a common requirement for React Native projects that use ESM.
    // The `.*` before the package names is to account for pnpm's directory structure.
    'node_modules/(?!.*(jest-expo|react-native|@react-native|@react-navigation/.*|expo|@expo/.*|expo-router|expo-linking|expo-constants|expo-modules-core|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens)/)',
  ],

  // Increase timeout for slower CI environments or heavy tests
  testTimeout: 10000,

  // Collect coverage from source files (adjust globs as necessary)
  collectCoverage: false,
  collectCoverageFrom: [
    'app/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/__mocks__/**'
  ],

  // Verbose test output
  verbose: true,

  // Provide a helpful message if someone runs tests on web environment where sqlite shim may error.
  // (This is just metadata for maintainers; behavior is controlled by the runtime setup files.)
  globals: {
    __DEV__: true
  }
};
