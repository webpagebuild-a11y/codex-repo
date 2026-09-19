// One-time import for a new cloud database. Generated files contain private data
// and stay under the git-ignored data directory.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { openStore } from './store.js';
process.loadEnvFile();
if(!process.env.RESEND_API_KEY)throw new Error('Configure RESEND_API_KEY in .env first.');
mkdirSync('data',{recursive:true});
const store=openStore(), settings=store.settings();
const secrets=existsSync('data/cloud-secrets.json')?JSON.parse(readFileSync('data/cloud-secrets.json','utf8')):{};
secrets.APP_TOKEN ||= randomBytes(32).toString('hex');
secrets.RESEND_API_KEY=process.env.RESEND_API_KEY;
secrets.DIGEST_EMAIL=settings.email;
for(const key of ['OPENAI_API_KEY','OPENAI_MODEL','GITHUB_TOKEN'])if(process.env[key])secrets[key]=process.env[key];
writeFileSync('data/cloud-secrets.json',JSON.stringify(secrets));
writeFileSync('data/cloud-access.txt',`SDET Radar cloud dashboard\nhttps://sdet-radar.sdet-radar.workers.dev\n\nPrivate workspace access token (paste into the dashboard unlock form):\n${secrets.APP_TOKEN}\n\nKeep this file private. This is not your Resend API key.\n`);
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const sql=[`INSERT OR IGNORE INTO kv(key,value) VALUES ('settings',${quote(JSON.stringify(settings))});`];
const lastSent=store.get('lastSent',null);if(lastSent)sql.push(`INSERT OR IGNORE INTO kv(key,value) VALUES ('lastSent',${quote(JSON.stringify(lastSent))});`);
for(const source of store.get('collection',{}).sources || [])sql.push(`INSERT OR IGNORE INTO sources(tech,payload) VALUES (${quote(source.tech)},${quote(JSON.stringify({...source,at:store.get('collection').at}))});`);
for(const item of store.items()){delete item.body;sql.push(`INSERT OR IGNORE INTO updates(id,tech,published,payload) VALUES (${quote(item.id)},${quote(item.tech)},${quote(item.published)},${quote(JSON.stringify(item))});`);}
for(const entry of store.history())sql.push(`INSERT OR IGNORE INTO deliveries(id,at,payload) VALUES (${quote(entry.id)},${quote(entry.at)},${quote(JSON.stringify(entry))});`);
writeFileSync('data/cloud-seed.sql',sql.join('\n'));store.db.close();console.log('Prepared private settings/history import, secrets, and dashboard access file. No secret values printed.');
