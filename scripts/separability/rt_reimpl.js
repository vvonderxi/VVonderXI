/*  INDEPENDENT REIMPLEMENTATION OF player_card_view's OUTFIELD rt PATH.
    Built from a FRESH pg_get_viewdef captured this session (17,115 chars, reassembled
    length MATCHED), not from any earlier reimplementation , none survives in the repo,
    so this is a genuinely separate transcription of the same SQL.  */
const fs=require('fs');

function percentRank(sortedVals, n){
  // Postgres percent_rank() = (rank-1)/(n-1), ties take the MINIMUM rank
  // => (count strictly less) / (n-1).  Returns a map value->pct.
  const m=new Map();
  if(n<=1){ sortedVals.forEach(v=>m.set(v,0)); return m; }
  let i=0;
  while(i<sortedVals.length){
    const v=sortedVals[i]; let j=i;
    while(j<sortedVals.length && sortedVals[j]===v) j++;
    m.set(v, i/(n-1));      // i = number strictly less than v
    i=j;
  }
  return m;
}
function pctMapFor(rows, keyFn){
  const vals=rows.map(keyFn).filter(v=>v!=null).slice().sort((a,b)=>a-b);
  return percentRank(vals, vals.length);
}
function quantileCont(arr,p){                       // Postgres percentile_cont
  const a=arr.slice().sort((x,y)=>x-y); if(!a.length) return null;
  const idx=p*(a.length-1), lo=Math.floor(idx), hi=Math.ceil(idx);
  return lo===hi ? a[lo] : a[lo]+(a[hi]-a[lo])*(idx-lo);
}

function buildEngine(raw){
  const wt=new Map();
  raw.weights.forEach(w=>wt.set(w.league_code+'|'+w.season_year, w.weight));

  /*  ---- scored : THE VIEW'S FINAL SELECT HAS NO WHERE CLAUSE, so the matview carries
      EVERY player_season_cards row (57,055) while the `scored` CTE the whole engine is
      built on is only those with minutes >= 300 AND goals IS NOT NULL. Reading the mv as
      if it were `scored` inflates every percentile population and drags gaw_ref down,
      which showed up as a bias proportional to gaw , biggest on Wingers, smallest on
      centre-backs. Filter FIRST.  */
  const scored=raw.cards.filter(c=>c.minutes!=null && c.minutes>=300 && c.goals!=null).map(c=>{
    const pens=c.penalties_scored==null?0:c.penalties_scored;
    const gaw = c.goals - 0.22*Math.min(pens, c.goals) + 0.7*(c.assists==null?0:c.assists);
    const w = wt.has(c.league_code+'|'+c.season_year) ? wt.get(c.league_code+'|'+c.season_year)
            : (c.league_strength_weight!=null ? c.league_strength_weight : 0.80);
    return {
      card_id:c.card_id, pos:c.position, pool:c.position_pool, minutes:c.minutes,
      season_year:c.season_year, rt_stored:c.rt, name:c.player_name,
      gaw, gaw90: gaw/(c.minutes/90.0), wt:w,
      def_share:c.def_share, def_share_pct:c.def_share_pct,
      tackles:c.tackles_total, ints:c.interceptions, blocks:c.tackles_blocks,
      duels_won:c.duels_won, duels_total:c.duels_total, team_def90:c.team_def90,
      goals:c.goals, assists:c.assists, pens
    };
  });

  const out=scored.filter(s=>s.pos!=='GK');
  const gaw_ref=quantileCont(out.map(s=>s.gaw),0.99);

  // ---- ranked percentiles
  const byPool=new Map();
  scored.forEach(s=>{ const k=s.pool||s.pos; if(!byPool.has(k)) byPool.set(k,[]); byPool.get(k).push(s); });
  const posPct=new Map(), posvolPct=new Map();
  for(const [k,rows] of byPool){ posPct.set(k, pctMapFor(rows,r=>r.gaw90)); posvolPct.set(k, pctMapFor(rows,r=>r.gaw)); }
  const absPctMap    = pctMapFor(out, r=>r.gaw90);     // partition: non-GK
  const absvolPctMap = pctMapFor(out, r=>r.gaw);

  // ---- pool_sig : sig = def_share_pct, recomputed by rank within pool (matches the view)
  const poolShare=new Map();
  scored.forEach(s=>{ if(s.pos==='GK'||s.def_share==null||s.pool==null||s.season_year<2016) return;
    if(!poolShare.has(s.pool)) poolShare.set(s.pool,[]); poolShare.get(s.pool).push(s); });
  const sharePct=new Map();
  for(const [k,rows] of poolShare) sharePct.set(k, pctMapFor(rows,r=>r.def_share));

  return {scored,out,gaw_ref,posPct,posvolPct,absPctMap,absvolPctMap,sharePct,poolShare};
}

const DEFPOOL=['CB','FB','CDM'];
function bFor(s,E,over){
  const gaw   = over && over.gaw!==undefined ? over.gaw : s.gaw;
  const gaw90 = over && over.gaw90!==undefined ? over.gaw90 : s.gaw90;
  const sig   = over && over.sig!==undefined ? over.sig
              : (E.sharePct.has(s.pool) ? E.sharePct.get(s.pool).get(s.def_share) : undefined);
  const k=s.pool||s.pos;
  const pos_pct    = over&&over.pos_pct!==undefined    ? over.pos_pct    : E.posPct.get(k).get(gaw90);
  const posvol_pct = over&&over.posvol_pct!==undefined ? over.posvol_pct : E.posvolPct.get(k).get(gaw);
  const abs_pct    = over&&over.abs_pct!==undefined    ? over.abs_pct    : E.absPctMap.get(gaw90);
  const absvol_pct = over&&over.absvol_pct!==undefined ? over.absvol_pct : E.absvolPctMap.get(gaw);

  const PERF = 0.65*((0.50*(0.60*pos_pct + 0.40*(abs_pct==null?0:abs_pct))
                    + 0.50*(0.60*posvol_pct + 0.40*(absvol_pct==null?0:absvol_pct)))*100)
             + 0.35*((100*gaw)/gaw_refOf(E))
             + (DEFPOOL.includes(s.pool) ? Math.min(12, 0.45*gaw*Math.pow(s.wt,2.5)) : 0);
  let FLOOR=0;
  if(sig!=null){
    if(DEFPOOL.includes(s.pool))            FLOOR=Math.min(64, 44+22*sig);
    else if(s.pool==='CM')                  FLOOR=Math.min(60, 32+24*sig);
    else if(['ST','Winger','CAM'].includes(s.pool)) FLOOR=12*sig;
  }
  const AVAIL = 0.30*Math.min(95, 100*(s.minutes/(s.minutes+380)));
  return (0.70*Math.max(PERF,FLOOR) + AVAIL) * (1 - (1-s.wt)*0.35);
}
function gaw_refOf(E){ return E.gaw_ref; }

function anchorsOf(bs){
  const d=bs.slice().sort((a,b)=>b-a);
  return { btop:d[0], b95:d[11], b90:d[149], b85:d[649] };
}
function rtFrom(b,a){
  let v;
  if(b<=80) v=Math.round(b);
  else if(b<=a.b85) v=Math.floor(80+(b-80)*5.0/(a.b85-80));
  else if(b<=a.b90) v=Math.floor(85+(b-a.b85)*5.0/(a.b90-a.b85));
  else if(b<=a.b95) v=Math.floor(90+(b-a.b90)*5.0/(a.b95-a.b90));
  else              v=Math.floor(95+(b-a.b95)*2.0/(a.btop-a.b95));
  return Math.min(100,Math.max(0,v))|0;
}
module.exports={buildEngine,bFor,anchorsOf,rtFrom,pctMapFor,percentRank};
