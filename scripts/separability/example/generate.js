/*  GENERATES A REAL VERDICT FOR THE INSIDE-THE-MARGIN STATE, so the register can be judged
    on model output rather than on the prompt that asks for it.

    RUN IT , the key is deliberately NOT in .env (section D: keep it blank), so pass it in:

        ANTHROPIC_API_KEY=sk-ant-... node scripts/separability/example/generate.js

    The prompt beside this file is the EXACT user message compare.html built for
    ?a=130728&b=141853 , Salah 24/25 (95) against Messi 14/15 (96), gap 1 against a margin
    of 2.83, captured from the live page rather than retyped. The system prompt is read from
    api/analyse.js, so this cannot drift from what production sends.  */
const fs=require('fs'), path=require('path');
const A=require(path.join(__dirname,'..','..','..','api','analyse.js'));
const prompt=fs.readFileSync(path.join(__dirname,'inside_margin_prompt.txt'),'utf8');
if(!process.env.ANTHROPIC_API_KEY){
  console.error('ANTHROPIC_API_KEY is not set. Pass it on the command line; do not put it back in .env.');
  process.exit(1);
}
(async()=>{
  const r=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:A.MODEL||'claude-sonnet-4-5',max_tokens:1024,
      system:[{type:'text',text:A.VERDICT_SYSTEM}],messages:[{role:'user',content:prompt}]})
  });
  const j=await r.json();
  if(!r.ok){ console.error('HTTP',r.status,JSON.stringify(j).slice(0,500)); process.exit(1); }
  const txt=j.content[0].text;
  let v; try{ v=JSON.parse(txt); }catch(e){ console.log(txt); return; }
  for(const k of ['who','tag','p1','p2','h2h','verdict']) console.log('=== '+k+' ===\n'+v[k]+'\n');
  /*  THE THREE THINGS THAT MAKE THIS STATE PASS OR FAIL, checked mechanically, because
      reading prose for a banned phrase is exactly the check a human eye slides over.  */
  const all=[v.p1,v.p2,v.h2h,v.verdict,v.who].join(' ');
  const bad=[/\b95\b/,/\b96\b/,/Generational/i,/\bIconic\b/i,/edges? it/i,/shades? it/i,/just ahead/i,/better of the two/i];
  const hits=bad.filter(re=>re.test(all)).map(String);
  console.log(hits.length? 'CONTRACT BREACHES: '+hits.join(' ') : 'CONTRACT CLEAN , no score, no band, no winner phrasing.');
})();
