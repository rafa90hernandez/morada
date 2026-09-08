const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Expo SDK 57's on-demand filesystem currently fails to index some files
// inside pnpm's isolated .pnpm store on native Windows. The standard Metro
// filesystem works correctly on Windows while preserving the same dependency
// graph used by CI.
config.experiments = {
  ...config.experiments,
  onDemandFilesystem: false,
};

module.exports = config;
