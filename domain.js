import semver from 'semver';
import { createHash } from 'node:crypto';
import { catalog } from './catalog.js';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const plain = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*`]/g, '').replace(/\s+/g, ' ').trim();
export function safeUrl(value) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } }
export function classify(item) {
  const text = `${item.title} ${item.body}`;
  const security = /\b(security|vulnerabilit\w*|CVE-\d|remote code execution)\b/i.test(text);
  const breaking = /\b(breaking change|removed support|end.of.life|deprecat\w*)\b/i.test(text);
  const useful = /\b(test\w*|debug\w*|fix\w*|release|runner|browser|assert\w*|automation|CI)\b/i.test(text);
  return { ...item, impact: security || breaking ? 'High' : useful ? 'Medium' : 'Low', action: security || breaking, kind: security ? 'Security' : breaking ? 'Breaking change' : 'Release', summary: plain(item.body || item.title).slice(0, 260), ranking: 'Rule-based' };
}
export function versionNote(item, settings) {
  const current = settings.versions[item.tech];
  if (!current) return 'Add your project version for upgrade context.';
  const a = semver.valid(current), b = semver.valid(item.version);
  if (!a || !b) return `Project version: ${current}. Review compatibility in the source; automatic comparison is unavailable.`;
  return semver.gt(b, a) ? `${a} → ${b}: a newer release is available. Review affected versions in the source before upgrading.` : `Your version ${a} is at or above this release (${b}). This does not establish security exposure.`;
}
export function validateSettings(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid preferences.');
  const email = String(input.email || '').trim();
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Enter a valid email address.');
  if (!['daily', 'weekly', 'important'].includes(input.frequency)) throw new Error('Choose a supported frequency.');
  if (!Number.isInteger(input.limit) || input.limit < 5 || input.limit > 10) throw new Error('Choose 5–10 headlines.');
  if (!Array.isArray(input.technologies) || input.technologies.some(id => !catalog.some(t => t.id === id))) throw new Error('Unknown technology.');
  if (typeof input.enabled !== 'boolean') throw new Error('Invalid email setting.');
  if (input.enabled && (!email || !input.technologies.length)) throw new Error('Add an email address and at least one technology before enabling delivery.');
  const versions = {};
  for (const t of catalog) { const v = input.versions?.[t.id]; if (v) { if (typeof v !== 'string' || v.length > 40 || !/^[\w.+-]+$/.test(v)) throw new Error('Use a version such as 1.50.0.'); versions[t.id] = v; } }
  return { email, frequency: input.frequency, limit: input.limit, enabled: input.enabled, technologies: [...new Set(input.technologies)], versions };
}
export function chooseDigest(items, settings, sent = new Set()) {
  return items.filter(x => !x.sample && settings.technologies.includes(x.tech) && !sent.has(x.id) && (settings.frequency !== 'important' || x.impact === 'High'))
    .sort((a,b) => ({High:3,Medium:2,Low:1}[b.impact] - {High:3,Medium:2,Low:1}[a.impact]) || b.published.localeCompare(a.published)).slice(0, settings.limit);
}
export function due(settings, lastSent, now = Date.now()) {
  if (!settings.enabled || !settings.email) return false;
  return !lastSent || now - Date.parse(lastSent) >= (settings.frequency === 'weekly' ? 7 * 86400000 : settings.frequency === 'daily' ? 86400000 : 3600000);
}
export function emailBody(items) {
  return '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#173e37"><h1>SDET Radar</h1><p>Your stack. Only the signals that matter.</p>' + ['High','Medium','Low'].map((impact,i) => {
    const group = items.filter(x => x.impact === impact); if (!group.length) return '';
    return `<h2>${['Must Know','Useful','Optional'][i]}</h2>` + group.map(x => `<article style="margin:24px 0"><h3><a href="${escape(safeUrl(x.url))}">${escape(x.title)}</a></h3><p>${escape(x.summary)}</p><p>Impact: ${escape(x.impact)} · Action needed: ${x.action ? 'Yes — review source' : 'No'}</p></article>`).join('');
  }).join('') + '<hr><p>Manage delivery or turn it off in your SDET Radar app → Preferences. Ranking is advisory; verify details in the original source.</p></div>';
}
