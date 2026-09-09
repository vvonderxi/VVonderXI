/*  PAIRING MEASUREMENT , SECOND PASS, 2026-09-09.
    Differences from the first pass, all of which remove an assumption rather than vary one:
      , SEs are PER CARD and MEASURED, not read off a four-row band table.
      , rt >= 80 is EXHAUSTIVE: all C(1406,2) = 987,415 pairs. No sampling, no seed, no
        sampling error in the headline number at all.
      , the sub-80 SE is measured (median 6.04) instead of assumed from the population
        median (5.58). It is HIGHER, so the first pass understated this region.
      , real pairings are re-read at CURRENT rt. verdict_cache stamps the rt that was live
        when the verdict was written, and 10,770 cards moved on 2026-09-08.  */
const fs=require('fs');
const raw=JSON.parse(fs.readFileSync('/tmp/engine_inputs.json','utf8'));
const model=process.env.MODEL||'pois';
const se=JSON.parse(fs.readFileSync('/tmp/se_'+model+'.json','utf8'));
const seById=new Map(se.map(r=>[r.card_id,r.se]));
// rt -> median measured SE, for cards outside the measured set
const byRt={}; se.forEach(r=>{(byRt[r.rt]=byRt[r.rt]||[]).push(r.se);});
const medRt={}; Object.keys(byRt).forEach(k=>{const a=byRt[k].sort((x,y)=>x-y); medRt[k]=a[Math.floor(a.length/2)];});
function seOf(card_id, rt){
  if(seById.has(card_id)) return seById.get(card_id);
  for(let d=0;d<=40;d++){ if(medRt[rt-d]!=null&&medRt[rt+d]!=null) return (medRt[rt-d]+medRt[rt+d])/2;
    if(medRt[rt-d]!=null) return medRt[rt-d]; if(medRt[rt+d]!=null) return medRt[rt+d]; }
  return null;
}
const Z=parseFloat(process.env.Z||'1.96');
const inside=(rtA,seA,rtB,seB)=>Math.abs(rtA-rtB) < Z*Math.sqrt(seA*seA+seB*seB);

const out=raw.cards.filter(c=>c.rt!=null&&c.position!=='GK'&&c.position_pool!=='GK');
const hi=out.filter(c=>c.rt>=80);
console.log('model='+model+'  z='+Z);
console.log('scored outfield: '+out.length+'   at rt>=80: '+hi.length);

// ---------- EXHAUSTIVE, rt >= 80 ----------
let n=0,ins=0;
for(let i=0;i<hi.length;i++){ const a=hi[i], sa=seOf(a.card_id,a.rt);
  for(let j=i+1;j<hi.length;j++){ const b=hi[j]; n++; if(inside(a.rt,sa,b.rt,seOf(b.card_id,b.rt))) ins++; } }
console.log('\nEXHAUSTIVE all pairs at rt>=80 : '+n.toLocaleString()+' pairs');
console.log('   inside uncertainty          : '+(100*ins/n).toFixed(1)+'%     (first pass, sampled: 97.9%)');

// ---------- EXHAUSTIVE within each band ----------
console.log('\nwithin-band, exhaustive:');
[['Generational',95,999],['Iconic',90,94],['World Class',85,89],['Standout',80,84]].forEach(([nm,lo,hiB])=>{
  const g=out.filter(c=>c.rt>=lo&&c.rt<=hiB); let m=0,k=0;
  for(let i=0;i<g.length;i++) for(let j=i+1;j<g.length;j++){ m++; if(inside(g[i].rt,seOf(g[i].card_id,g[i].rt),g[j].rt,seOf(g[j].card_id,g[j].rt))) k++; }
  console.log('   '+nm.padEnd(14)+String(g.length).padStart(5)+' cards  '+String(m).padStart(9)+' pairs   '+(m?(100*k/m).toFixed(1):'-')+'% inside');
});

// ---------- all outfield: exhaustive is 1.26e9 pairs, so a large draw with a NEW seed ----------
let a2=987654321; const rnd=()=>{a2=(a2*1664525+1013904223)>>>0;return a2/4294967296;};
let n2=0,i2=0; const K=2000000;
for(let t=0;t<K;t++){ const x=out[Math.floor(rnd()*out.length)], y=out[Math.floor(rnd()*out.length)];
  if(x.card_id===y.card_id){t--;continue;} n2++;
  if(inside(x.rt,seOf(x.card_id,x.rt),y.rt,seOf(y.card_id,y.rt))) i2++; }
console.log('\nall scored outfield, '+(K/1e6)+'M draws, new seed: '+(100*i2/n2).toFixed(1)+'% inside   (first pass: 48.1%)');
