/*  INDEPENDENT SE RE-DERIVATION , 2026-09-09.
    DIFFERENT FROM THE 2026-09-06 AUDIT ON EVERY AXIS THAT COULD CARRY AN ERROR:
      engine      : re-transcribed from a fresh viewdef (99.56% exact vs their 97.75%)
      population  : ALL 1,406 cards at rt >= 80 , a CENSUS, not a sample, so the headline
                    number carries no sampling error at all. Below 80, a stratified random
                    draw. Theirs was systematic + all rt >= 78.
      replicates  : 200 (theirs 120)
      seed        : 20260909
      noise model : Poisson (reproducing theirs) AND negative binomial (stressing it).
    AND ONE THING THEY COULD NOT HAVE CONTROLLED: the engine CHANGED on 2026-09-08.
    sig is now def_share_pct alone, so duel_quality has left the floor entirely. Their
    audit measured the pre-fix engine. This measures what is live.  */
const fs=require('fs');
const {buildEngine,bFor,anchorsOf,rtFrom}=require('./rt_reimpl.js');

// ---------- seeded RNG (mulberry32), seed differs from anything used before ----------
function mk(seed){ let a=seed>>>0; return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const rnd=mk(20260909);
function rnorm(){ let u=0,v=0; while(!u)u=rnd(); while(!v)v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function rpois(l){ if(l<=0) return 0;
  if(l<30){ const L=Math.exp(-l); let k=0,p=1; do{k++;p*=rnd();}while(p>L); return k-1; }
  // normal approximation with continuity correction for large lambda
  return Math.max(0, Math.round(l+Math.sqrt(l)*rnorm())); }
function rgamma(sh){ // Marsaglia-Tsang, shape>=1 handled; shape<1 by boost
  if(sh<1){ const u=rnd(); return rgamma(1+sh)*Math.pow(u,1/sh); }
  const d=sh-1/3, c=1/Math.sqrt(9*d);
  for(;;){ let x,v; do{ x=rnorm(); v=1+c*x; }while(v<=0); v=v*v*v;
    const u=rnd(); if(u<1-0.0331*x*x*x*x) return d*v;
    if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v))) return d*v; } }
function rnbinom(mu,phi){ if(mu<=0) return 0; if(phi<=1) return rpois(mu);
  const r=mu/(phi-1); return rpois(rgamma(r)*(phi-1)); }
function rbinom(n,p){ if(n<=0) return 0; let k=0; for(let i=0;i<n;i++) if(rnd()<p) k++; return k; }

// ---------- order-statistic helpers over a sorted array, with one value swapped ----------
function lowerBound(a,v){ let lo=0,hi=a.length; while(lo<hi){const m=(lo+hi)>>1; if(a[m]<v)lo=m+1; else hi=m;} return lo; }
// percent_rank of vNew in the population `sortedAsc` after removing one instance of vOld
function prSwap(sortedAsc,vOld,vNew){
  const n=sortedAsc.length;                       // population size is unchanged by a swap
  let less=lowerBound(sortedAsc,vNew);            // count strictly less than vNew (incl. vOld)
  if(vOld<vNew) less-=1;                          // vOld leaves the "strictly less" set
  return n>1 ? less/(n-1) : 0;
}
const raw=JSON.parse(fs.readFileSync('/tmp/engine_inputs.json','utf8'));
const E=buildEngine(raw);
const base_b=E.out.map(s=>bFor(s,E));
const A0=anchorsOf(base_b);
const idxOf=new Map(); E.out.forEach((s,i)=>idxOf.set(s.card_id,i));
const bDesc=base_b.slice().sort((a,b)=>b-a);

// sorted populations for the percentile lookups
const poolG90={}, poolGaw={}, poolShare={};
E.scored.forEach(s=>{ const k=s.pool||s.pos;
  (poolG90[k]=poolG90[k]||[]).push(s.gaw90); (poolGaw[k]=poolGaw[k]||[]).push(s.gaw); });
const absG90=E.out.map(s=>s.gaw90).sort((a,b)=>a-b);
const absGaw=E.out.map(s=>s.gaw).sort((a,b)=>a-b);
Object.keys(poolG90).forEach(k=>{poolG90[k].sort((a,b)=>a-b); poolGaw[k].sort((a,b)=>a-b);});
E.scored.forEach(s=>{ if(s.pos==='GK'||s.def_share==null||s.pool==null||s.season_year<2016) return;
  (poolShare[s.pool]=poolShare[s.pool]||[]).push(s.def_share); });
Object.keys(poolShare).forEach(k=>poolShare[k].sort((a,b)=>a-b));

/*  ANCHORS AFTER A SINGLE-CARD SWAP, IN O(log n).
    The anchors are the 1st / 12th / 150th / 650th largest b out of 50,269. Replacing one
    card's b can only move them by one position, so there is no need to re-sort: locate the
    old and new values in the descending array and read the k-th element of the virtual
    array (bDesc minus vOld plus vNew). The first version walked the array per replicate and
    was ~5 orders of magnitude slower , same answer, unusable.  */
function idxDesc(arr,v){                       // first index of v in a DESCENDING array
  let lo=0,hi=arr.length;
  while(lo<hi){ const m=(lo+hi)>>1; if(arr[m]>v) lo=m+1; else hi=m; }
  return lo;                                   // = count strictly greater than v
}
function kthDescSwap(arr,vOld,vNew,k){
  const i=idxDesc(arr,vOld);                   // vOld sits at or after i
  let p=idxDesc(arr,vNew);                     // insertion point of vNew (count strictly greater)
  if(i<p) p-=1;                                // removing vOld from above shifts vNew up one
  if(k===p) return vNew;
  if(k<p)  return (i>k)   ? arr[k]   : arr[k+1];
  return    (i>k-1) ? arr[k-1] : arr[k];
}
function anchorsSwap(vOld,vNew){
  if(vOld===vNew) return A0;
  return { btop:kthDescSwap(bDesc,vOld,vNew,0), b95:kthDescSwap(bDesc,vOld,vNew,11),
           b90:kthDescSwap(bDesc,vOld,vNew,149), b85:kthDescSwap(bDesc,vOld,vNew,649) };
}

function replicate(s,i,model,phi){
  const pens0=s.pens, g0=s.goals, a0=s.assists==null?0:s.assists;
  const g = model==='nb'? rnbinom(g0,phi) : rpois(g0);
  const a = model==='nb'? rnbinom(a0,phi) : rpois(a0);
  const pens = g0>0 ? rbinom(g, Math.min(1,pens0/g0)) : 0;
  const gaw = g - 0.22*Math.min(pens,g) + 0.7*a;
  const gaw90 = gaw/(s.minutes/90.0);
  const k=s.pool||s.pos;
  const over={ gaw, gaw90,
    pos_pct:    prSwap(poolG90[k], s.gaw90, gaw90),
    posvol_pct: prSwap(poolGaw[k], s.gaw,   gaw),
    abs_pct:    prSwap(absG90,     s.gaw90, gaw90),
    absvol_pct: prSwap(absGaw,     s.gaw,   gaw) };
  if(s.tackles!=null && s.def_share!=null && s.pool!=null && s.season_year>=2016 && poolShare[s.pool]){
    const t=model==='nb'?rnbinom(s.tackles,phi):rpois(s.tackles);
    const ic=model==='nb'?rnbinom(s.ints==null?0:s.ints,phi):rpois(s.ints==null?0:s.ints);
    const bl=model==='nb'?rnbinom(s.blocks==null?0:s.blocks,phi):rpois(s.blocks==null?0:s.blocks);
    const def90=(t+ic+bl)/(s.minutes/90.0);
    if(s.team_def90){ const ds=def90/s.team_def90;
      over.sig = prSwap(poolShare[s.pool], s.def_share, ds); }
  }
  const bNew=bFor(s,E,over);
  const A=anchorsSwap(base_b[i],bNew);
  return rtFrom(bNew,A);
}

function seFor(s,i,model,phi,R){
  const v=[]; for(let r=0;r<R;r++) v.push(replicate(s,i,model,phi));
  const m=v.reduce((x,y)=>x+y,0)/v.length;
  return Math.sqrt(v.reduce((x,y)=>x+(y-m)*(y-m),0)/(v.length-1));
}

const R=parseInt(process.env.REPS||'200',10);
const MODEL=process.env.MODEL||'pois';
const PHI=parseFloat(process.env.PHI||'1.5');
// CENSUS at rt >= 80; stratified random draw below it
/*  SAMPLE=all measures EVERY scored outfield card, which is what a SHIPPED gate needs.
    The rt-keyed fallback was measured and rejected: it flips 11.24% of sub-80 decisions
    against the per-card truth, because SE varies up to 5.8x WITHIN a single rt value down
    there. A gate that is wrong on one pairing in nine is not a gate.  */
if(process.env.SAMPLE==='all'){
  const every=E.out.filter(s=>s.rt_stored!=null);
  console.error('SAMPLE=all , '+every.length+' cards x '+(process.env.REPS||200)+' reps');
  const R2=parseInt(process.env.REPS||'200',10);
  const res2=every.map((s,n)=>{
    if(n%5000===0) console.error('  '+n+'/'+every.length);
    return {card_id:s.card_id, rt:s.rt_stored, pool:s.pool, se:seFor(s,idxOf.get(s.card_id),process.env.MODEL||'pois',parseFloat(process.env.PHI||'1.5'),R2)};
  });
  fs.writeFileSync('/tmp/se_all.json',JSON.stringify(res2));
  const m=res2.map(r=>r.se).sort((a,b)=>a-b);
  console.log('wrote /tmp/se_all.json  cards='+res2.length+'  median SE='+m[Math.floor(m.length/2)].toFixed(2));
  process.exit(0);
}
const hi=E.out.filter(s=>s.rt_stored!=null&&s.rt_stored>=80);
const loAll=E.out.filter(s=>s.rt_stored!=null&&s.rt_stored<80);
const lo=[]; { const want=2000; const step=loAll.length/want;
  for(let x=rnd()*step; x<loAll.length; x+=step) lo.push(loAll[Math.floor(x)]); }
const sample=hi.concat(lo);
console.error('model='+MODEL+(MODEL==='nb'?' phi='+PHI:'')+' reps='+R+' cards='+sample.length+' (census '+hi.length+' at rt>=80, '+lo.length+' below)');
const res=sample.map(s=>({card_id:s.card_id,rt:s.rt_stored,pool:s.pool,se:seFor(s,idxOf.get(s.card_id),MODEL,PHI,R)}));
fs.writeFileSync('/tmp/se_'+MODEL+'.json',JSON.stringify(res));
const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:null;};
const bands=[['Generational',95,999],['Iconic',90,94],['World Class',85,89],['Standout',80,84],['below 80',0,79]];
console.log('\nband           n      median SE   (recorded 2026-09-06)');
const rec={Generational:0.96,Iconic:2.00,'World Class':3.75,Standout:5.79,'below 80':null};
bands.forEach(([nm,lo2,hi2])=>{
  const g=res.filter(r=>r.rt>=lo2&&r.rt<=hi2).map(r=>r.se);
  console.log('  '+nm.padEnd(14)+String(g.length).padStart(6)+'   '+(med(g)||0).toFixed(2).padStart(7)+
    '      '+(rec[nm]==null?'not measured':rec[nm].toFixed(2)));
});
console.log('  ALL SAMPLED  '+String(res.length).padStart(6)+'   '+med(res.map(r=>r.se)).toFixed(2).padStart(7));
