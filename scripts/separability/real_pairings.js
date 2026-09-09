require('/home/odoo/projects/VVonderXI/node_modules/dotenv').config({path:'/home/odoo/projects/VVonderXI/.env',quiet:true});
const {createClient}=require('/home/odoo/projects/VVonderXI/node_modules/@supabase/supabase-js');
const fs=require('fs');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const raw=JSON.parse(fs.readFileSync('/tmp/engine_inputs.json','utf8'));
const card=new Map(raw.cards.map(c=>[c.card_id,c]));
const se=JSON.parse(fs.readFileSync('/tmp/se_pois.json','utf8'));
const seById=new Map(se.map(r=>[r.card_id,r.se]));
const byRt={}; se.forEach(r=>{(byRt[r.rt]=byRt[r.rt]||[]).push(r.se);});
const medRt={}; Object.keys(byRt).forEach(k=>{const a=byRt[k].sort((x,y)=>x-y);medRt[k]=a[Math.floor(a.length/2)];});
function seOf(id,rt){ if(seById.has(id))return seById.get(id);
  for(let d=0;d<=40;d++){ if(medRt[rt-d]!=null)return medRt[rt-d]; if(medRt[rt+d]!=null)return medRt[rt+d]; } return null; }
const Z=1.96;
(async()=>{
  const {data}=await sb.from('verdict_cache').select('card_id_a,card_id_b,rt_a,rt_b,winner_card_id');
  let stampedN=0, usable=0, insideNow=0, insideStamped=0, crowned=0, insideAndCrowned=0, rtMoved=0, bothGK=0;
  for(const r of data){
    const A=card.get(r.card_id_a), B=card.get(r.card_id_b);
    if(!A||!B) continue;
    if(A.position==='GK'||A.position_pool==='GK'||B.position==='GK'||B.position_pool==='GK'){ bothGK++; continue; }
    if(A.rt==null||B.rt==null) continue;
    usable++;
    if(r.rt_a!=null&&r.rt_b!=null){
      const stampedGap=Math.abs(r.rt_a-r.rt_b);
      const nowGap=Math.abs(A.rt-B.rt);
      if(stampedGap!==nowGap) rtMoved++;
      const sA=seOf(r.card_id_a,r.rt_a), sB=seOf(r.card_id_b,r.rt_b);
      stampedN++;
      if(stampedGap < Z*Math.sqrt(sA*sA+sB*sB)) insideStamped++;
    }
    const sa=seOf(A.card_id,A.rt), sbv=seOf(B.card_id,B.rt);
    const ins=Math.abs(A.rt-B.rt) < Z*Math.sqrt(sa*sa+sbv*sbv);
    if(ins) insideNow++;
    if(r.winner_card_id!=null){ crowned++; if(ins) insideAndCrowned++; }
  }
  const p=x=>(100*x/usable).toFixed(1)+'%';
  console.log('verdict_cache rows                :', data.length);
  console.log('keeper pairings skipped           :', bothGK, '(no verdict is generated for these any more)');
  console.log('usable outfield pairings          :', usable);
  console.log('  pairs whose rt GAP has moved    :', rtMoved, 'since the verdict was stamped');
  console.log('');
  console.log('INSIDE UNCERTAINTY, at CURRENT rt :', insideNow, '=', p(insideNow), '  (first pass, stamped rt + band SEs: 66.7%)');
  console.log('INSIDE UNCERTAINTY, at STAMPED rt :', insideStamped, 'of', stampedN, '=', (100*insideStamped/stampedN).toFixed(1)+'%', '  <- the first pass\'s population, re-measured with per-card SEs');
  console.log('currently crown a winner          :', crowned, '=', p(crowned));
  console.log('INSIDE *AND* CROWNED              :', insideAndCrowned, '=', p(insideAndCrowned), '  (first pass: 61.5%)');
})();
