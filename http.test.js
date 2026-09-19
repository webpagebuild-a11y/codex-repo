import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('HTTP API persists preferences, rejects cross-origin writes, and keeps server files private', async () => {
  const temp = await mkdtemp(join(tmpdir(),'sdet-radar-test-'));
  const child = spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',DB_PATH:join(temp,'test.sqlite'),ENABLE_SCHEDULER:'false',APP_TOKEN:''},stdio:['ignore','pipe','pipe']});
  try {
    const output = await Promise.race([once(child.stdout,'data').then(([chunk])=>chunk.toString()),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);timer.unref();})]);
    const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];assert.ok(address);
    const state = await (await fetch(`${address}/api/state`)).json();
    const settings = {...state.settings,email:'test@example.com',frequency:'daily'};
    assert.equal((await fetch(`${address}/api/settings`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)})).status,403);
    assert.equal((await fetch(`${address}/api/settings`,{method:'PUT',headers:{'Content-Type':'application/json','X-Radar-CSRF':state.csrf,Origin:'https://elsewhere.example'},body:JSON.stringify(settings)})).status,403);
    assert.equal((await fetch(`${address}/api/settings`,{method:'PUT',headers:{'Content-Type':'application/json','X-Radar-CSRF':state.csrf},body:JSON.stringify(settings)})).status,200);
    assert.equal((await (await fetch(`${address}/api/state`)).json()).settings.email,'test@example.com');
    assert.equal((await fetch(`${address}/.env`)).status,404);assert.equal((await fetch(`${address}/server.js`)).status,404);
    assert.match(await (await fetch(address)).text(),/SDET Radar/);
  } finally {child.kill();await once(child,'exit');await rm(temp,{recursive:true,force:true});}
});
