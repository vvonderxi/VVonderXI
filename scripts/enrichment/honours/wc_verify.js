require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const inPCV = async (pat) => { const { data } = await sb.from('player_card_view').select('api_player_id, player_name, season, team_name').ilike('player_name', pat); const u = {}; (data||[]).forEach(r=>{ if(!u[r.api_player_id]) u[r.api_player_id]=r.player_name+' ['+r.season+' '+r.team_name+']'; }); return u; };
(async () => {
  for (const [label, pat] of [['Casillas','%casillas%'],['Puyol','%puyol%'],['Xabi Alonso','%alonso%'],['Valdes','%vald_s%'],['Arbeloa','%arbeloa%'],['Marchena','%marchena%'],['Howedes','%wedes%'],['Armani','%armani%'],['Xavi','%xavi%'],['Javi Martinez','%javi%'],['Casillas full','%iker%']]) {
    const u = await inPCV(pat); const keys = Object.keys(u);
    console.error(label+': '+(keys.length? keys.slice(0,8).map(k=>k+'='+u[k]).join('  |  ') : 'NONE IN player_card_view'));
  }
})();
