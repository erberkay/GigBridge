const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Metro can't resolve require("./foo.js") when the .js extension is explicit
// (double-extension bug). Remove .js from all require() calls in nth-check.
function patchNodeModules() {
  const nthRoot = path.resolve(__dirname, 'node_modules/nth-check');

  function fix(fp, fn) {
    if (!fs.existsSync(fp)) return;
    const before = fs.readFileSync(fp, 'utf8');
    const after = fn(before);
    if (after !== before) fs.writeFileSync(fp, after);
    // Always touch to bust Metro's transform cache
    const now = new Date();
    fs.utimesSync(fp, now, now);
  }

  // cjs.js: ./lib/index.js → ./lib/index
  fix(path.join(nthRoot, 'cjs.js'), (c) =>
    c.replace(/require\(['"]\.\/lib\/index(?:\.js)?['"]\)/g, 'require("./lib/index")')
  );
  // lib/index.js: ./parse.js → ./parse, ./compile.js → ./compile
  fix(path.join(nthRoot, 'lib/index.js'), (c) =>
    c
      .replace(/require\(['"]\.\/parse(?:\.js)?['"]\)/g, 'require("./parse")')
      .replace(/require\(['"]\.\/compile(?:\.js)?['"]\)/g, 'require("./compile")')
  );
  // lib/compile.js: boolbase (bare or relative) → ../../boolbase/index (no .js)
  fix(path.join(nthRoot, 'lib/compile.js'), (c) =>
    c.replace(/require\(['"](?:(?:\.\.\/)+)?boolbase(?:\/index)?(?:\.js)?['"]\)/g,
      'require("../../boolbase/index")')
  );
  // Touch parse.js so Metro picks up the directory
  fix(path.join(nthRoot, 'lib/parse.js'), (c) => c);
}

patchNodeModules();

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;

// Intercept bare specifiers that Metro can't resolve through the normal package exports chain.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'nth-check') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/nth-check/lib/index.js'),
    };
  }
  if (moduleName === 'boolbase') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/boolbase/index.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Bump to bust Metro's transform cache whenever this config changes.
config.cacheVersion = 'resolve-request-v6';

module.exports = config;
