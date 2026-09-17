/*  DOWNSTREAM REFERENCE CAPTURE , READ-ONLY.
    Captures every place a card_id is referenced outside player_season_cards, so
    that if an id ends up attached to the wrong component the break is visible
    here rather than on a card face weeks later. Nothing is changed.
*/
'use strict';
require('dotenv').config();
const fs=require('fs'), path=require('path');
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const OUT=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]
  :'migrations/fusion_split_2026-09-16';
const all=async(t,c)=>{const o=[];const S=1000;
  for(let f=0;;f+=S){const {data,error}=await sb.from(t).select(c).range(f,f+S-1);
    if(error) throw new Error(t+': '+error.message); o.push(...data); if(data.length<S)break;} return o;};
(async()=>{
  const verdict=await all('verdict_cache','pair_key,card_id_a,card_id_b,cache_version,created_at');
  const notes  =await all('notes_cache','card_id,cache_version,stats_hash,created_at');
  const refs={};
  const add=(id,where,key)=>{ if(id==null) return;
    (refs[id]=refs[id]||[]).push({table:where,key}); };
  for(const r of verdict){ add(r.card_id_a,'verdict_cache',r.pair_key); add(r.card_id_b,'verdict_cache',r.pair_key); }
  for(const r of notes) add(r.card_id,'notes_cache',String(r.card_id));
  const total=Object.values(refs).reduce((a,v)=>a+v.length,0);
  const payload={captured_at:new Date().toISOString(),
    verdict_cache_rows:verdict.length, notes_cache_rows:notes.length,
    total_references:total, distinct_card_ids:Object.keys(refs).length,
    by_card:refs, verdict_rows:verdict, notes_rows:notes};
  fs.mkdirSync(OUT,{recursive:true});
  const f=path.join(OUT,'before_references.json');
  fs.writeFileSync(f,JSON.stringify(payload,null,1));
  const back=JSON.parse(fs.readFileSync(f,'utf8'));
  if(back.total_references!==total) throw new Error('read-back mismatch');
  console.log(JSON.stringify({file:f,verdict_cache_rows:verdict.length,notes_cache_rows:notes.length,
    total_references:total,distinct_card_ids:Object.keys(refs).length,readback:'OK'},null,1));
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
