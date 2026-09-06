require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const teamsOf = async id => { const { data } = await sb.from('player_card_view').select('season_year, league_code, team_name').eq('api_player_id', id).order('season_year'); return (data||[]).map(r=>r.season_year+' '+r.league_code+' '+r.team_name); };
const nm = async id => { const { data } = await sb.from('players').select('name, full_name').eq('api_player_id', id); return data&&data[0]?data[0].name+' / '+data[0].full_name:'(none)'; };
(async () => {
  console.error('== Otávio candidates (want Porto, PRT 2022/23) ==');
  for (const id of [1262, 266013, 380]) console.error('  '+id+'  '+await nm(id)+'  cards: '+(await teamsOf(id)).slice(0,10).join(' | '));
  console.error('\n== search "Otávio" in players (PRT/Porto) ==');
  const { data: ot } = await sb.from('players').select('api_player_id, name, full_name').ilike('full_name', '%ot_vio%');
  (ot||[]).slice(0,12).forEach(p=>console.error('  '+p.api_player_id+'  '+p.name+' / '+p.full_name));
  for (const q of ['janssen','ahmadi']) {
    console.error('\n== search "'+q+'" in players ==');
    const { data } = await sb.from('players').select('api_player_id, name, full_name').ilike('full_name', '%'+q+'%');
    (data||[]).slice(0,10).forEach(p=>console.error('  '+p.api_player_id+'  '+p.name+' / '+p.full_name));
  }
})();
