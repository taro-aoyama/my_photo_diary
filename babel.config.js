module.exports = function (api) {
  return {
    // Use the Expo preset which is compatible with React Native & jest-expo environments.
    // If you prefer the metro preset, replace 'babel-preset-expo' with 'module:metro-react-native-babel-preset'.
    presets: ['babel-preset-expo'],

    plugins: [
      // Optional: map '@/...' to project root. Useful for absolute imports used in the repo.
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],

      // react-native-reanimated plugin has been moved to react-native-worklets
      // It must be listed last (per library docs)
      'react-native-worklets/plugin',
    ],

    // Keep source maps enabled in dev/test environments
    sourceMaps: api.env() === 'production' ? false : 'inline',
  }
}
