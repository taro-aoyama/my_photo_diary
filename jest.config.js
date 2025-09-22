module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/)?(@?react-native.*|expo.*))',
  ],
};
