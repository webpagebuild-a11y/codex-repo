export function cloudStore(db) {
  return {
    async get(key, fallback = null) { const row = await db.prepare('SELECT value FROM kv WHERE key=?').bind(key).first(); return row ? JSON.parse(row.value) : fallback; },
    async set(key, value) { return db.prepare('INSERT OR REPLACE INTO kv(key,value) VALUES (?,?)').bind(key,JSON.stringify(value)).run(); },
    async items() { const {results} = await db.prepare('SELECT payload FROM updates ORDER BY published DESC LIMIT 600').all(); return results.map(x=>JSON.parse(x.payload)); },
    async add(item) { return db.prepare('INSERT OR IGNORE INTO updates(id,tech,published,payload) VALUES (?,?,?,?)').bind(item.id,item.tech,item.published,JSON.stringify(item)).run(); },
    async has(id) { return !!await db.prepare('SELECT id FROM updates WHERE id=?').bind(id).first(); },
    async history() { const {results} = await db.prepare('SELECT payload FROM deliveries ORDER BY at DESC LIMIT 100').all(); return results.map(x=>JSON.parse(x.payload)); },
    async delivery(entry) { return db.prepare('INSERT OR REPLACE INTO deliveries(id,at,payload) VALUES (?,?,?)').bind(entry.id,entry.at,JSON.stringify(entry)).run(); },
    async sources() { const {results} = await db.prepare('SELECT payload FROM sources').all(); return results.map(x=>JSON.parse(x.payload)); },
    async source(entry) { return db.prepare('INSERT OR REPLACE INTO sources(tech,payload) VALUES (?,?)').bind(entry.tech,JSON.stringify(entry)).run(); },
    async lock(name, owner, now = Date.now()) { const result = await db.prepare('INSERT INTO locks(name,expires,owner) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET expires=excluded.expires,owner=excluded.owner WHERE locks.expires < ?').bind(name,now+300000,owner,now).run(); return result.meta.changes > 0; },
    async unlock(name, owner) { return db.prepare('DELETE FROM locks WHERE name=? AND owner=?').bind(name,owner).run(); },
  };
}
