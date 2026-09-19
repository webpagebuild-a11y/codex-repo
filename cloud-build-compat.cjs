// Wrangler also invokes esbuild for module analysis with --no-bundle.
// Use the identical WASM API on Windows where the native binary cannot traverse
// the user's protected parent directory. No permissions or paths are bypassed.
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, parent, isMain) {
  return original.call(this, name === 'esbuild' ? 'esbuild-wasm' : name, parent, isMain);
};
