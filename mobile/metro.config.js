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
// node_modules when it is installed (a fallback for packages this app lacks).
config.watchFolders = [sharedSrc, ...(fs.existsSync(repoModules) ? [repoModules] : [])];
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules'), repoModules];

// Packages imported by shared files (papaparse, xlsx) resolve from this app,
// as if imported here: one copy of each, and EAS builds (which install only
// this folder) behave like local runs. It also keeps lazily loaded packages
// inside the project: xlsx is loaded with import(), and from ../node_modules
// its dev bundle URL started with "../", which the server dropped, so it
// served the app's other copy and Excel import failed with
// "Requiring unknown module".
const appOrigin = path.join(projectRoot, 'package.json');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isPackage = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
  if (isPackage && context.originModulePath.startsWith(sharedSrc + path.sep)) {
    return context.resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
