#!/usr/bin/env node
// VVonderXI — BSD enumeration probe (read-only, no writes, no Supabase)
// Answers ONE question: can BSD list teams in a league and players in a team?
// If yes -> free league flesh-out is possible. If no -> API-Football required.

const BSD = 'https://sports.bzzoiro.com/api/v2';
const KEY = process.env.BSD_API_KEY;
if (!KEY) { console.error('BSD_API_KEY not set'); process.exit(1); }

const pause = ms => new Promise(r => setTimeout(r, ms));

async function hit(label, path) {
  try {
    const r = await fetch(`${BSD}${path}`, {
      headers: { Authorization: `Token ${KEY}` },
      signal: AbortSignal.timeout(12000),
    });
    let body = ''; let arr = null;
    try { const j = await r.json(); body = JSON.stringify(j);
      arr = j.results || j.players || j.teams || j.squad || (Array.isArray(j) ? j : null);
    } catch {}
    const count = Array.isArray(arr) ? `(${arr.length} items)` : '';
    console.log(`${r.ok ? 'PASS' : 'FAIL'} [${r.status}] ${label} ${count}`);
    console.log(`     ${path}`);
    console.log(`     ${body.slice(0, 200)}\n`);
    return r.ok ? (() => { try { return JSON.parse(body); } catch { return null; } })() : null;
  } catch (e) {
    console.log(`FAIL [ERR] ${label}\n     ${path}\n     ${e.message}\n`);
    return null;
  }
}

(async () => {
  console.log('\n=== BSD ENUMERATION PROBE ===\n');

  await hit('League detail (id=1, PL)', '/leagues/1/'); await pause(400);

  // The decisive enumeration entry points:
  await hit('Teams in league (path)',  '/leagues/1/teams/'); await pause(400);
  await hit('Teams in league (query)', '/teams/?league=1');  await pause(400);

  // Baseline: name search (we know this works) -> get a real team id from a career row
  const s = await hit('Name search (Haaland)', '/players/?name=Haaland&limit=3'); await pause(400);
  const p = (s?.results || s?.players || (Array.isArray(s) ? s : []))[0];
  if (!p) { console.log('No player from name search — stopping.'); return; }
  console.log(`-> player id=${p.id} (${p.name})\n`);

  const career = await hit(`Career (id=${p.id})`, `/players/${p.id}/career/`); await pause(400);
  const row = (career?.seasons || career?.results || (Array.isArray(career) ? career : []))[0] || {};
  console.log(`-> career row keys: ${Object.keys(row).join(', ') || '(none)'}\n`);

  // The decisive squad endpoints:
  if (row.team_id) {
    await hit('Squad: team players (path)',  `/teams/${row.team_id}/players/`); await pause(400);
    await hit('Squad: team squad (path)',    `/teams/${row.team_id}/squad/`);   await pause(400);
    await hit('Squad: players by team (qry)',`/players/?team=${row.team_id}&limit=5`); await pause(400);
  } else {
    console.log('No team_id in career row — cannot test squad endpoints.\n');
  }

  console.log('=== PROBE COMPLETE ===');
  console.log('DECIDING LINE: is there a PASS with items on a "Teams in league" endpoint');
  console.log('AND a PASS with items on a "Squad / team players" endpoint?');
  console.log('  BOTH pass  -> free BSD league flesh-out is possible. I build it.');
  console.log('  Either fails -> BSD cannot enumerate. Full coverage needs API-Football.');
})();
