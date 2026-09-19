import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaults } from './catalog.js';
export function openStore(path = process.env.DB_PATH || 'data/radar.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS updates (id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, payload TEXT NOT NULL);');
  const get = (key, fallback) => { const row = db.prepare('SELECT value FROM kv WHERE key=?').get(key); return row ? JSON.parse(row.value) : fallback; };
  const set = (key, value) => db.prepare('INSERT OR REPLACE INTO kv VALUES (?,?)').run(key, JSON.stringify(value));
  return { db, get, set, settings: () => get('settings', defaults),
    items: () => db.prepare('SELECT payload FROM updates').all().map(x => JSON.parse(x.payload)),
    add: item => db.prepare('INSERT INTO updates VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE updates.payload != excluded.payload').run(item.id, JSON.stringify(item)).changes,
    history: () => db.prepare('SELECT payload FROM deliveries ORDER BY rowid DESC').all().map(x => JSON.parse(x.payload)),
    delivery: entry => db.prepare('INSERT OR REPLACE INTO deliveries VALUES (?,?)').run(entry.id, JSON.stringify(entry)),
  };
}
