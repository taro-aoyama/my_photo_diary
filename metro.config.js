/**
 * Metro configuration for React Native (Expo) to make pnpm-installed packages
 * resolvable by Metro (e.g. zustand).
 *
 * Problem:
 *  - pnpm uses a content-addressable store and creates symlinks which can confuse
 *    Metro's module resolution. Metro may not look into the workspace/node_modules
 *    by default, causing "Unable to resolve 'zustand'" errors.
 *
 * Solution:
 *  - Add the workspace `node_modules` to `watchFolders`.
 *  - Tell Metro to use both project and workspace `node_modules` via
 *    `resolver.nodeModulesPaths`.
 *  - Provide `extraNodeModules` mapping to ensure Metro resolves packages from
 *    the project's `node_modules`.
 *
 * Note:
 *  - This file is CommonJS so Metro can require it.
 *  - Adjust `workspaceRoot` if your repository layout differs.
 */

const { getDefaultConfig } = require('@expo/metro-config')
const path = require('path')
const fs = require('fs')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..') // adjust if monorepo root is higher

const config = getDefaultConfig(projectRoot)

// Ensure Metro watches the workspace node_modules so it notices changes / symlinks
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules')
const watchFolders = [...(config.watchFolders || [])]
if (fs.existsSync(workspaceNodeModules)) {
  watchFolders.push(workspaceNodeModules)
}
config.watchFolders = watchFolders

// Make Metro resolve modules from both project and workspace node_modules
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: (function () {
    const paths = [path.resolve(projectRoot, 'node_modules')]
    const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules')
    if (fs.existsSync(workspaceNodeModules)) {
      paths.push(workspaceNodeModules)
    }
    return paths
  })(),
  // Force Metro to look into the project's node_modules for any package name
  extraNodeModules: new Proxy(
    {},
    {
      get: function (_target, name) {
        return path.resolve(projectRoot, 'node_modules', name)
      },
    },
  ),
  // Include commonjs extension in case some packages use .cjs
  sourceExts: [
    ...((config.resolver && config.resolver.sourceExts) || []),
    'cjs',
  ],
}

module.exports = config
