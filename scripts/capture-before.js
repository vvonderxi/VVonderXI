/*  BEFORE-CAPTURE , READ-ONLY. Touches no table, view or schema.
    ==============================================================
    Same discipline as the assists repair (SS E, 2026-09-16): capture the full
    population BEFORE any write, read it back OFF DISK, and assert it row for
    row. A capture that is not read back is a file, not a rollback.

    WHY THE WHOLE POPULATION AND NOT THE TARGET ROWS: SS C , "A TARGET-ONLY
    SNAPSHOT CANNOT SEE A RIPPLE." The percentile pools are global and are not
    partitioned by league or season, so writing to N cards moves cards nobody
    touched. A snapshot scoped to the write can only ever confirm the write.

    EMITS an md5 over the ordered (card_id, rt) set. That single value is what
    proved the assists repair inert on all 57,055 cards, and it is the cheapest
    honest answer to "did anything move".
*/
'use strict';
require('dotenv').config();
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

const arg=(n,d)=>{const a=process.argv.slice(2),i=a.indexOf('--'+n);return i<0?d:a[i+1];};
const OUTDIR=arg('out','migrations/fusion_split_2026-09-16');
const LABEL=arg('label','before');

/*  Every column a split or re-import could touch, plus rt and the keys.
    minutes and appearances are here because they are the denominators; rt is
    here because it is the thing we are protecting.  */
const COLS='card_id,api_player_id,player_name,team_name,league_code,season,season_year,'
         + 'position,position_pool,appearances,minutes,goals,assists,starts,rt';

const all=async()=>{const out=[];const S=1000;
  for(let f=0;;f+=S){
    const {data,error}=await sb.from('player_card_mv').select(COLS)
      .order('card_id',{ascending:true}).range(f,f+S-1);
    if(error) throw new Error('read: '+error.message);
    out.push(...data);
    /*  SS C: a query returning exactly 1000 rows has hit PostgREST's cap, not
        the end of the data. Continue until a short page proves the end.  */
    if(data.length<S) break;
  }
  return out;};

(async()=>{
  const rows=await all();
  if(!rows.length) throw new Error('refusing to write an empty capture');
  const file=path.join(OUTDIR,`${LABEL}_full.json`);
  fs.mkdirSync(OUTDIR,{recursive:true});
  fs.writeFileSync(file,JSON.stringify(rows));

  /*  READ IT BACK OFF DISK AND ASSERT ROW FOR ROW. Not a length check , SS C
      records that a partial snapshot passes for a complete one precisely
      because the count looks plausible.  */
  const back=JSON.parse(fs.readFileSync(file,'utf8'));
  if(back.length!==rows.length) throw new Error(`read-back length ${back.length} != ${rows.length}`);
  let bad=0;
  for(let i=0;i<rows.length;i++){
    const a=rows[i],b=back[i];
    for(const k of Object.keys(a)) if(a[k]!==b[k]){bad++;break;}
  }
  if(bad) throw new Error(`read-back differs on ${bad} rows`);

  const rtLine=rows.map(r=>`${r.card_id},${r.rt}`).join('\n');
  const md5=crypto.createHash('md5').update(rtLine).digest('hex');
  fs.writeFileSync(path.join(OUTDIR,`${LABEL}_rt.csv`),'card_id,rt\n'+rtLine+'\n');

  const nullRt=rows.filter(r=>r.rt==null).length;
  const summary={label:LABEL,captured_at:new Date().toISOString(),rows:rows.length,
    columns:COLS.split(','),rt_md5:md5,rt_null:nullRt,
    file,readback:'row-for-row OK'};
  fs.writeFileSync(path.join(OUTDIR,`${LABEL}_summary.json`),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,1));
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
