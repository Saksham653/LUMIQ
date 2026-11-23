// Metro config for the LUMIQ phone app.
// The app reuses the web app's tested logic from ../src (calculations, CSV and
// Excel reading, data health, forecast, the AI planner) instead of copying it.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');
const sharedSrc = path.join(repoRoot, 'src');
const repoModules = path.join(repoRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Metro only serves files it watches: the shared source, plus the web app's
// node_modules when it is installed, because a shared file's imports
// (papaparse, xlsx) resolve upward from that file.
config.watchFolders = [sharedSrc, ...(fs.existsSync(repoModules) ? [repoModules] : [])];

// Without the web app's node_modules (EAS builds install only this folder),
// shared imports fall back to this app's own copies.
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules'), repoModules];

module.exports = config;
