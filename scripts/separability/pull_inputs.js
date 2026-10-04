require('/home/odoo/projects/VVonderXI/node_modules/dotenv').config({path:'/home/odoo/projects/VVonderXI/.env',quiet:true});
const {createClient}=require('/home/odoo/projects/VVonderXI/node_modules/@supabase/supabase-js');
const fs=require('fs');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const COLS='card_id,position,position_pool,season_year,league_code,minutes,goals,assists,penalties_scored,tackles_total,interceptions,tackles_blocks,duels_won,duels_total,team_def90,def90,def_share,def_share_pct,rt,league_strength_weight,player_name';
(async()=>{
  const out=[]; const PAGE=1000;
  for(let from=0;;from+=PAGE){
    const {data,error}=await sb.from('player_card_mv').select(COLS).order('card_id',{ascending:true}).range(from,from+PAGE-1);
    if(error){ console.error(error.message); process.exit(1); }
    if(!data.length) break; out.push(...data); if(data.length<PAGE) break;
  }
  const w=await sb.from('engine_league_weights').select('league_code,season_year,weight');
  if(w.error){ console.error(w.error.message); process.exit(1); }
  fs.writeFileSync('/tmp/engine_inputs.json', JSON.stringify({cards:out, weights:w.data}));
  const back=JSON.parse(fs.readFileSync('/tmp/engine_inputs.json','utf8'));
  console.log('cards',out.length,'read back',back.cards.length, back.cards.length===out.length?'MATCH':'MISMATCH');
  console.log('engine_league_weights rows', w.data.length);
})();
