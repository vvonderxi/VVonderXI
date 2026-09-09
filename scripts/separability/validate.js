const fs=require('fs');
const {buildEngine,bFor,anchorsOf,rtFrom}=require('./engine.js');
const raw=JSON.parse(fs.readFileSync('/tmp/engine_inputs.json','utf8'));
const E=buildEngine(raw);
const bs=E.out.map(s=>bFor(s,E));
const A=anchorsOf(bs);
console.log('gaw_ref (p99):', E.gaw_ref.toFixed(6));
console.log('anchors: btop',A.btop.toFixed(2),'b95',A.b95.toFixed(2),'b90',A.b90.toFixed(2),'b85',A.b85.toFixed(2));
let exact=0, within1=0, n=0, worst=0, worstCard=null;
const diffs=[];
E.out.forEach((s,i)=>{
  if(s.rt_stored==null) return;
  n++;
  const rt=rtFrom(bs[i],A), d=rt-s.rt_stored;
  if(d===0) exact++; if(Math.abs(d)<=1) within1++;
  diffs.push(d);
  if(Math.abs(d)>Math.abs(worst)){ worst=d; worstCard=s.name+' '+s.season_year+' stored '+s.rt_stored+' mine '+rt; }
});
const c={}; diffs.forEach(d=>c[d]=(c[d]||0)+1);
console.log('cards compared :', n);
console.log('EXACT          :', exact, '=', (100*exact/n).toFixed(2)+'%');
console.log('within 1       :', within1, '=', (100*within1/n).toFixed(2)+'%');
console.log('diff histogram :', JSON.stringify(c));
console.log('worst          :', worstCard);
