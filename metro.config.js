const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

/**
 * zustand's ESM build uses `import.meta`, which Metro's web output (a classic
 * script) cannot execute — the page dies with
 * "Cannot use 'import.meta' outside a module".
 * Pin every zustand import to its CommonJS file so no import.meta ever enters
 * the bundle (any platform, dev server and static export alike).
 */
const ZUSTAND_DIR = path.dirname(require.resolve("zustand/package.json"));

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    const sub = moduleName === "zustand" ? "index" : moduleName.slice("zustand/".length);
    const filePath = path.join(ZUSTAND_DIR, `${sub}.js`);
    if (fs.existsSync(filePath)) {
      return { type: "sourceFile", filePath };
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
