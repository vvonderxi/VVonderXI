const R='/home/odoo/projects/VVonderXI';
require(R+'/node_modules/dotenv').config({path:R+'/.env',quiet:true});
process.env.ANTHROPIC_API_KEY='test-not-real';
const {createClient}=require(R+'/node_modules/@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const handler=require(R+'/api/analyse.js');
const IP='203.0.113.'+(90+Math.floor(Math.random()*150));   // TEST-NET-3, never a real client

/*  MOCK ONLY ANTHROPIC. supabase-js uses global.fetch too, so replacing it wholesale made the
    LIMITER's own ledger reads hang on the same latch as the model call.  */
const REAL=global.fetch.bind(global);
let holds=[], slow=false;
global.fetch=async(u,o)=>{
  if(String(u).indexOf('api.anthropic.com')<0) return REAL(u,o);
  if(slow) await new Promise(r=>holds.push(r));
  return {ok:true,status:200,json:async()=>({content:[{text:JSON.stringify({p1:'a',p2:'b',h2h:'c',verdict:'d',tag:'e',who:'f'})}]})};
};
const release=()=>{slow=false; holds.splice(0).forEach(r=>r());};
const mk=()=>{const r={code:null,body:null,hdr:{}};r.setHeader=(k,v)=>{r.hdr[k]=v};r.status=c=>{r.code=c;return r};r.json=b=>{r.body=b;return r};r.end=()=>r;return r};
const call=()=>{const res=mk();return handler({method:'POST',headers:{origin:'https://vvonderxi.com','x-forwarded-for':IP+', 10.0.0.1'},body:{messages:[{role:'user',content:'hi'}]}},res).then(()=>res)};
const clean=()=>sb.from('api_rate_events').delete().eq('ip',IP);
const inflight=async()=>(await sb.from('api_rate_events').select('id',{count:'exact',head:true}).eq('ip',IP).is('finished_at',null).in('kind',['verdict','notes'])).count;
const T=[];const say=(n,p,d)=>{T.push(p);console.log((p?'PASS  ':'FAIL  ')+n.padEnd(56)+(d||''))};
const KA=setInterval(()=>{},1000);
process.on('unhandledRejection',e=>{console.error('UNHANDLED:',e&&e.message||e);process.exit(9)});

(async()=>{try{
 await clean();
 console.log('CONCURRENCY , two tabs on one connection is an ordinary thing to do\n');
 slow=true; const a=call(), b=call();
 await new Promise(r=>setTimeout(r,1200));
 const n1=await inflight();
 say('two concurrent generations are BOTH admitted', n1===2, '('+n1+' in flight)');
 const c=await call();
 say('the THIRD is refused 429', c.code===429&&/in flight/.test(c.body.error||''), c.code+' '+(c.body&&c.body.error||''));
 say('  with a SHORT Retry-After', c.hdr['Retry-After']==='30', 'Retry-After='+c.hdr['Retry-After']);
 release();
 const rs=await Promise.all([a,b]);
 say('the two originals completed normally', rs.every(r=>r.code===null||r.code===200), 'codes '+rs.map(r=>String(r.code)).join(','));
 await new Promise(r=>setTimeout(r,600));
 const n2=await inflight();
 say('both slots CLOSED on completion', n2===0, '('+n2+' still in flight)');
 const d=await call();
 say('a retry now SUCCEEDS', d.code===null||d.code===200, 'code '+d.code);

 console.log('\nTHE SLOT THAT COULD STRAND A USER');
 slow=true; const e=call(); await new Promise(r=>setTimeout(r,1000));
 say('an in-flight generation holds exactly one slot', (await inflight())===1);
 await sb.from('api_rate_events').update({started_at:new Date(Date.now()-6*60e3).toISOString()}).eq('ip',IP).is('finished_at',null);
 slow=false;   // e is ALREADY latched inside fetch; this only stops NEW calls latching
 const f=await call(), g=await call();
 say('a STALE slot (>5min) no longer blocks', f.code===null||f.code===200, 'code '+f.code);
 say('  and a second still gets through', g.code===null||g.code===200, 'code '+g.code);
 release(); await e;

 console.log('\nHOURLY CAP');
 await clean();
 const rows=[]; for(let i=0;i<29;i++) rows.push({ip:IP,kind:'verdict',finished_at:new Date().toISOString()});
 await sb.from('api_rate_events').insert(rows);
 const h30=await call(); say('the 30th generation is admitted', h30.code===null||h30.code===200, 'code '+h30.code);
 const h31=await call(); say('the 31st is refused 429', h31.code===429&&/hourly/.test(h31.body.error||''), h31.code+' '+(h31.body&&h31.body.error||''));
 say('  with a LONGER Retry-After', h31.hdr['Retry-After']==='600', 'Retry-After='+h31.hdr['Retry-After']);
 const ref=(await sb.from('api_rate_events').select('id',{count:'exact',head:true}).eq('ip',IP).like('kind','refused%')).count;
 say('refusals land in the ledger, not just the log', ref>=1, ref+' refusal row(s)');
 const okc=(await sb.from('api_rate_events').select('id',{count:'exact',head:true}).eq('ip',IP).in('kind',['verdict','notes'])).count;
 say('refusals do NOT count toward the cap', okc===30, okc+' countable rows');

 const r2=mk();
 await handler({method:'POST',headers:{origin:'https://vvonderxi.com','x-forwarded-for':'198.51.100.7'},body:{messages:[{role:'user',content:'hi'}]}},r2);
 say('a DIFFERENT ip is untouched by that cap', r2.code===null||r2.code===200, 'code '+r2.code);
 await sb.from('api_rate_events').delete().eq('ip','198.51.100.7');

 await clean(); clearInterval(KA);
 console.log('\n'+(T.every(Boolean)?'ALL PASS':'SOMETHING FAILED')+'  ('+T.filter(Boolean).length+'/'+T.length+')');
 process.exit(T.every(Boolean)?0:1);
}catch(err){console.error('TEST THREW:',err&&err.stack||err);clearInterval(KA);process.exit(9)}})();
