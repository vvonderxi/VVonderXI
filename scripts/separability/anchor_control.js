// CONTROL: the fast swap must agree with a brute-force re-sort. If it does not, everything
// downstream is void, so this runs before any SE is believed.
const fs=require('fs');
const {buildEngine,bFor,anchorsOf}=require('./engine.js');
const raw=JSON.parse(fs.readFileSync('/tmp/engine_inputs.json','utf8'));
const E=buildEngine(raw); const b=E.out.map(s=>bFor(s,E));
const bDesc=b.slice().sort((x,y)=>y-x); const A0=anchorsOf(b);
function idxDesc(arr,v){let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m]>v)lo=m+1;else hi=m;}return lo;}
function kthDescSwap(arr,vOld,vNew,k){const i=idxDesc(arr,vOld);let p=idxDesc(arr,vNew);if(i<p)p-=1;
  if(k===p)return vNew; if(k<p)return (i>k)?arr[k]:arr[k+1]; return (i>k-1)?arr[k-1]:arr[k];}
let bad=0,tested=0;
let a=1;const rnd=()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};
for(let t=0;t<3000;t++){
  const i=Math.floor(rnd()*b.length);
  // bias toward the sharp end, where a swap actually moves an anchor
  const vNew = rnd()<0.5 ? b[i]*(0.5+rnd()*1.6) : 80+rnd()*70;
  const arr=b.slice(); arr[i]=vNew;
  const truth=anchorsOf(arr);
  const mine={btop:kthDescSwap(bDesc,b[i],vNew,0),b95:kthDescSwap(bDesc,b[i],vNew,11),
              b90:kthDescSwap(bDesc,b[i],vNew,149),b85:kthDescSwap(bDesc,b[i],vNew,649)};
  tested++;
  for(const k of ['btop','b95','b90','b85']) if(Math.abs(truth[k]-mine[k])>1e-9){ bad++; if(bad<4) console.log('MISMATCH',k,truth[k],mine[k]); break; }
}
console.log('anchor swap control: tested',tested,'mismatches',bad, bad===0?'PASS':'FAIL');
