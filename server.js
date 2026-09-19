import { eligible } from './testing-policy.js';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { catalog, samples } from './catalog.js';
import { openStore } from './store.js';
import { validateSettings, versionNote, chooseDigest, emailBody } from './domain.js';
import { collect, deliver } from './pipeline.js';
try { process.loadEnvFile(); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 3000);
if (!['127.0.0.1','localhost','::1'].includes(host) && (!process.env.APP_TOKEN || process.env.APP_TOKEN.length < 24)) throw new Error('Remote hosting requires an APP_TOKEN of at least 24 characters and an HTTPS reverse proxy.');
const token = process.env.APP_TOKEN || '', csrf = randomBytes(24).toString('hex');
const store = openStore(); let busy = false;
const same = (a,b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x,y); };
const files = { '/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/style.css': ['style.css','text/css'] };
async function body(req) { let value = ''; for await (const chunk of req) { value += chunk; if (value.length > 20000) throw new Error('Request too large.'); } return JSON.parse(value || '{}'); }
async function runJob(sendEmail = false) {
  if (busy) throw new Error('A collection is already running.'); busy = true;
  try {
    const last = store.get('collection',null);
    const result = !sendEmail || !last || Date.now() - Date.parse(last.at) >= 3600000 ? await collect(store) : { status:'already-collected' };
    if (sendEmail) result.delivery = await deliver(store);
    return result;
  } finally { busy = false; }
}
const server = http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const reply = (status, data) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
  try {
    // Host checking also protects a loopback deployment from DNS rebinding.
    if (!req.headers.host || (!process.env.APP_TOKEN && !['127.0.0.1','localhost','[::1]'].includes(req.headers.host.replace(/:\d+$/,'')))) return reply(403,{error:'Unrecognized host.'});
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      if (token && !same(req.headers.authorization || '',`Bearer ${token}`)) return reply(401,{error:'Enter your app access token to continue.'});
      if (req.method !== 'GET') {
        if (req.headers['x-radar-csrf'] !== csrf) return reply(403,{error:'Refresh the app and try again.'});
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return reply(403,{error:'Cross-origin requests are not allowed.'});
        if (!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'JSON required.'});
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const settings = store.settings(), items = store.items();
        return reply(200,{ csrf, catalog, settings, items: items.filter(x => eligible(x,settings) && settings.technologies.includes(x.tech)).map(x => ({ ...x, versionNote: versionNote(x,settings) })), samples, history: store.history(), collection: store.get('collection',null), schedulerError: store.get('schedulerError',null), busy, integrations: { ai: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL), email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), scheduler: process.env.ENABLE_SCHEDULER === 'true' } });
      }
      if (req.method === 'PUT' && url.pathname === '/api/settings') { const settings = validateSettings(await body(req)); store.set('settings',settings); return reply(200,{settings}); }
      if (req.method === 'POST' && url.pathname === '/api/collect') return reply(200, await runJob());
      if (req.method === 'GET' && url.pathname === '/api/digest') { const items = chooseDigest(store.items(),store.settings()); return reply(200,{items,html:emailBody(items)}); }
      return reply(404,{error:'Not found.'});
    }
    if (req.method !== 'GET' || !files[url.pathname]) return reply(404,{error:'Not found.'});
    const [path,type] = files[url.pathname]; res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`}); res.end(await readFile(new URL(path,import.meta.url)));
  } catch (error) { reply(400,{error:error.message}); }
});
if (process.env.ENABLE_SCHEDULER === 'true') {
  const tick = () => { if (!busy) runJob(true).then(() => store.set('schedulerError',null)).catch(e => { store.set('schedulerError',{at:new Date().toISOString(),error:e.message}); console.error('Scheduled job:', e.message); }); };
  setInterval(tick,60000).unref(); setTimeout(tick,10000).unref();
}
server.listen(port,host,() => console.log(`SDET Radar: http://${host}:${server.address().port}`));
