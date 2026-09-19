import { eligible } from './testing-policy.js';
import { catalog, defaults, samples } from './catalog.js';
import { hash, plain, safeUrl, classify, validateSettings, chooseDigest, versionNote, emailBody } from './domain.js';
import { dailyDue } from './schedule.js';
import { parseFeed, request, rank } from './pipeline.js';
import { cloudStore } from './cloud-store.js';

const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
const settingsFor = async (store,env) => store.get('settings',{...defaults,email:env.DIGEST_EMAIL || '',frequency:'daily',enabled:true});
export function cloudDue(settings,lastSent,now,env) {
  if (!settings.enabled || !settings.email || env.ENABLE_SCHEDULER !== 'true') return false;
  if(settings.frequency==='daily') return dailyDue(lastSent,now,env.DELIVERY_TIME || '08:00',env.DELIVERY_TIMEZONE || 'America/New_York');
  return !lastSent || now-Date.parse(lastSent)>=(settings.frequency==='weekly'?7*86400000:3600000);
}
export async function collectOne(store,env,technology,now=Date.now()) {
  const owner=crypto.randomUUID(), name=`collect:${technology.id}`;
  if(!await store.lock(name,owner,now)) return {tech:technology.id,ok:true,count:0,busy:true};
  let count=0;
  try {
    const h={'User-Agent':'SDET-Radar',Accept:technology.source.type==='github'?'application/vnd.github+json':'application/xml'};
    if(technology.source.type==='github' && env.GITHUB_TOKEN)h.Authorization=`Bearer ${env.GITHUB_TOKEN}`;
    const response=await request(technology.source.url,{headers:h});
    const entries=technology.source.type==='github'?(await response.json()).filter(x=>!x.draft).map(x=>({title:`${technology.name}: ${x.name || x.tag_name}`,body:String(x.body || '').split('\n').map(plain).join('\n'),url:x.html_url,published:x.published_at,prerelease:!!x.prerelease,version:x.tag_name,tech:technology.id})):parseFeed(await response.text(),technology);
    for(const raw of entries){
      const url=safeUrl(raw.url), timestamp=Date.parse(raw.published);
      if(!url||!raw.title||!Number.isFinite(timestamp)||timestamp<now-30*86400000||timestamp>now+86400000||/\b(webinar|sponsored|register now|conference|save your seat)\b/i.test(raw.title))continue;
      const canonical=new URL(url);canonical.hash='';for(const key of [...canonical.searchParams.keys()])if(key.startsWith('utm_'))canonical.searchParams.delete(key);
      const id=hash(canonical.href);if(await store.has(id))continue;
      const item=await rank({...raw,id,url:canonical.href,published:new Date(timestamp).toISOString(),body:raw.body.slice(0,6000),sample:false},env);
      // Full source text is not needed for display or ranking after ingestion.
      delete item.body;const result=await store.add(item);count+=result.meta.changes;
    }
    const health={tech:technology.id,at:new Date(now).toISOString(),ok:true,count};await store.source(health);return health;
  }catch(error){const health={tech:technology.id,at:new Date(now).toISOString(),ok:false,count,error:error.message};await store.source(health);return health;}
  finally{await store.unlock(name,owner);}
}
export async function sendCloudDigest(store,env,now=Date.now(),send=request) {
  const settings=await settingsFor(store,env);
  if(!cloudDue(settings,await store.get('lastSent'),now,env))return {status:'not-due'};
  if(!env.RESEND_API_KEY || !env.EMAIL_FROM)return {status:'not-configured'};
  const owner=crypto.randomUUID();if(!await store.lock('delivery',owner,now))return {status:'busy'};
  try {
    // Recheck after obtaining the database lock, including overlapping cron invocations.
    if(!cloudDue(settings,await store.get('lastSent'),now,env))return {status:'not-due'};
    const history=await store.history(), pending=history.find(x=>x.status==='pending');
    if(pending && now-Date.parse(pending.at)>23*3600000)throw new Error('Unresolved delivery is older than the safe retry window. Check Resend before retrying.');
    if(pending && pending.email!==settings.email)throw new Error('Resolve the pending delivery before changing recipient.');
    if(pending && pending.items.some(x=>!eligible(x,settings)||!settings.technologies.includes(x.tech)))throw new Error('Pending delivery predates the testing focus. Resolve it before retrying.');
    const sent=new Set(history.filter(x=>x.status==='sent'&&x.email===settings.email).flatMap(x=>x.items.map(i=>i.id)));
    const items=chooseDigest((await store.items()).filter(x=>Date.parse(x.published)>now-30*86400000),settings,sent);
    if(!pending && !items.length)return {status:'no-updates'};
    const entry=pending || {id:hash(`${settings.email}:${items.map(x=>x.id).sort().join(',')}`),email:settings.email,from:env.EMAIL_FROM,items,at:new Date(now).toISOString(),status:'pending'};
    if(!pending)await store.delivery(entry);
    const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':entry.id},body:JSON.stringify({from:entry.from,to:[entry.email],subject:`Your SDET Tech Radar — ${entry.items.length} useful updates`,html:emailBody(entry.items)})});
    const receipt=await response.json();if(!receipt.id)throw new Error('Missing email receipt.');
    await store.delivery({...entry,status:'sent',providerId:receipt.id});await store.set('lastSent',new Date(now).toISOString());
    return {status:'sent',count:entry.items.length};
  }finally{await store.unlock('delivery',owner);}
}
export default {
  async fetch(req,env) {
    const url=new URL(req.url);
    if(!url.pathname.startsWith('/api/')) {
      const asset=await env.ASSETS.fetch(req);const response=new Response(asset.body,asset);
      response.headers.set('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      response.headers.set('X-Content-Type-Options','nosniff');return response;
    }
    // Fail closed if the deployment has no private workspace access token.
    if(!env.APP_TOKEN || env.APP_TOKEN.length<24 || hash(req.headers.get('Authorization') || '')!==hash(`Bearer ${env.APP_TOKEN}`))return json({error:'Enter your app access token to continue.'},401);
    const csrf=hash(`csrf:${env.APP_TOKEN}`), store=cloudStore(env.DB);
    try {
      if(req.method!=='GET'){
        if(req.headers.get('X-Radar-CSRF')!==csrf)return json({error:'Refresh the app and try again.'},403);
        if(req.headers.get('Origin') && req.headers.get('Origin')!==url.origin)return json({error:'Cross-origin writes are not allowed.'},403);
        if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
      }
      if(req.method==='GET'&&url.pathname==='/api/state'){
        const [settings,items,history,sources]=await Promise.all([settingsFor(store,env),store.items(),store.history(),store.sources()]);
        const at=sources.map(x=>x.at).sort().at(-1);
        return json({csrf,catalog,settings,items:items.filter(x=>eligible(x,settings)&&settings.technologies.includes(x.tech)).map(x=>({...x,versionNote:versionNote(x,settings)})),samples,history,collection:at?{at,added:sources.reduce((sum,x)=>sum+x.count,0),sources}:null,busy:false,schedulerError:await store.get('schedulerError'),integrations:{ai:!!(env.OPENAI_API_KEY&&env.OPENAI_MODEL),email:!!(env.RESEND_API_KEY&&env.EMAIL_FROM),scheduler:env.ENABLE_SCHEDULER==='true',cloud:true}});
      }
      if(req.method==='PUT'&&url.pathname==='/api/settings'){
        const text=await req.text();if(text.length>20000)return json({error:'Request too large.'},413);
        const settings=validateSettings(JSON.parse(text));await store.set('settings',settings);return json({settings});
      }
      if(req.method==='POST'&&url.pathname==='/api/collect'){
        const settings=await settingsFor(store,env), health=await store.sources();
        const selected=catalog.filter(t=>settings.technologies.includes(t.id)).sort((a,b)=>(health.find(x=>x.tech===a.id)?.at || '').localeCompare(health.find(x=>x.tech===b.id)?.at || ''));
        if(!selected.length)return json({added:0,sources:[]});
        const result=await collectOne(store,env,selected[0]);return json({added:result.count,sources:[result],partial:true,message:'Checked one source. Cloud collection rotates through the stack automatically.'});
      }
      if(req.method==='GET'&&url.pathname==='/api/digest'){const items=chooseDigest(await store.items(),await settingsFor(store,env));return json({items,html:emailBody(items)});}
      if(req.method==='GET'&&url.pathname==='/api/health')return json({lastCron:await store.get('lastCron'),lastJob:await store.get('lastJob'),error:await store.get('schedulerError'),scheduler:env.ENABLE_SCHEDULER==='true'});
      if(req.method==='POST'&&url.pathname==='/api/test-email'){
        const settings=await settingsFor(store,env);
        if(!settings.email||!env.RESEND_API_KEY)return json({error:'Email is not configured.'},400);
        const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':hash(`cloud-test:${settings.email}:${new Date().toISOString().slice(0,10)}`)},body:JSON.stringify({from:env.EMAIL_FROM,to:[settings.email],subject:'SDET Radar — your cloud delivery is connected',text:'Your SDET Radar email connection is working from Cloudflare. Your daily digest is scheduled for 8:00 a.m. Eastern Time and will run even while your PC is off. This connection test does not replace your next scheduled digest.'})});
        const receipt=await response.json();if(!receipt.id)throw new Error('Missing email receipt.');await store.set('testReceipt',{id:receipt.id,at:new Date().toISOString()});return json({status:'sent',id:receipt.id});
      }
      return json({error:'Not found.'},404);
    }catch(error){return json({error:error.message},400);}
  },
  async scheduled(event,env,ctx) {
    const now=event.scheduledTime,store=cloudStore(env.DB);
    if(env.ENABLE_SCHEDULER!=='true')return;
    try {
      await store.set('lastCron',new Date(now).toISOString());
      // Separate delivery from feed parsing to respect the free plan's CPU budget.
      const settings=await settingsFor(store,env);
      if((settings.frequency!=='daily' && new Date(now).getUTCMinutes()%5!==0) || (settings.frequency==='daily' && dailyDue(null,now,env.DELIVERY_TIME || '08:00',env.DELIVERY_TIMEZONE || 'America/New_York'))){const result=await sendCloudDigest(store,env,now);await store.set('lastJob',{at:new Date(now).toISOString(),...result});}
      else if(new Date(now).getUTCMinutes()%5===0){
        const active=catalog.filter(t=>settings.technologies.includes(t.id));
        if(active.length){const t=active[Math.floor(now/300000)%active.length];await collectOne(store,env,t,now);}
      }
      await store.set('schedulerError',null);
    }catch(error){await store.set('schedulerError',{at:new Date(now).toISOString(),error:error.message});throw error;}
  },
};
