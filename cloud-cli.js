// Keep deployment credentials and logs outside source control.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const dir=resolve('data/cloudflare-cli');mkdirSync(dir,{recursive:true});
const compatibility=process.platform==='win32'?['--require',resolve('cloud-build-compat.cjs')]:[];
const child=spawn(process.execPath,[...compatibility,'node_modules/wrangler/bin/wrangler.js',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,XDG_CONFIG_HOME:dir,WRANGLER_LOG_PATH:resolve(dir,'logs'),WRANGLER_SEND_METRICS:'false'}});
child.on('exit',code=>process.exit(code ?? 1));
