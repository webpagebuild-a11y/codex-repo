import { mkdirSync, copyFileSync } from 'node:fs';
import { build } from 'esbuild-wasm';
mkdirSync('cloud-assets',{recursive:true});
for(const name of ['index.html','app.js','style.css'])copyFileSync(name,`cloud-assets/${name}`);
console.log('Prepared three public assets. No configuration or secret files are included.');
await build({entryPoints:['cloud-worker.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',external:['node:crypto'],outfile:'data/cloud-build/worker.js',minify:true});
console.log('Cloud worker bundled.');
