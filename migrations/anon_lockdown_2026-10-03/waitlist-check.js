#!/usr/bin/env node
/*  THE ONE WRITE PATH , RUN AFTER APPLY_2.sql.
    ================================================================================
    Route A hands anon exactly one grant back: INSERT on waitlist_emails. This proves
    the path works AND that it is still the only thing anon can do there , an insert
    that works is half the claim, and the half that is easy to check.

    IT WRITES A REAL ROW and then removes it with the service key, so it is honest
    about cost: a probe that only tests the refusal case cannot tell a working form
    from a broken one. The address is unroutable by construction (.invalid is
    reserved by RFC 2606), so nothing can ever be sent to it.

    RUN   node migrations/anon_lockdown_2026-10-03/waitlist-check.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.SUPABASE_URL;
const KEY = fs.readFileSync(path.join(ROOT, 'iwonder.html'), 'utf8')
  .match(/sb_publishable_[A-Za-z0-9_-]+/)[0];
const PROBE = 'lockdown-probe@example.invalid';

const call = (method, qs, body, extra) => fetch(`${BASE}/rest/v1/waitlist_emails${qs || ''}`, {
  method,
  headers: Object.assign({
    'Content-Type': 'application/json', apikey: KEY,
    Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal',
  }, extra || {}),
  body: body ? JSON.stringify(body) : undefined,
});
const denied = (s, t) => s === 401 || s === 403 || /permission denied|42501/i.test(t);

(async () => {
  let bad = 0;
  const say = (ok, label, detail) => { if (!ok) bad++; console.log(`  ${ok ? 'ok    ' : 'WRONG '}${label.padEnd(44)}${detail}`); };
  console.log('\n=== the waitlist write path, with the key the pages ship ===\n');

  const ins = await call('POST', '', { email: PROBE, source: 'lockdown probe' });
  const insBody = await ins.text();
  say(ins.status === 201 || ins.status === 200, 'INSERT works (the form can sign people up)',
      ins.status + ' ' + insBody.slice(0, 60));

  const dup = await call('POST', '', { email: PROBE.toUpperCase(), source: 'lockdown probe' });
  say(dup.status === 409, 'a repeat address is refused by the unique index',
      dup.status + (dup.status === 409 ? '  (the form treats this as success)' : '  EXPECTED 409'));

  const sel = await call('GET', '?select=*&limit=1');
  const selBody = await sel.text();
  say(denied(sel.status, selBody), 'SELECT still denied (cannot read the list)', sel.status);

  const upd = await call('PATCH', '?email=eq.' + encodeURIComponent(PROBE), { source: 'x' });
  say(denied(upd.status, await upd.text()), 'UPDATE still denied', upd.status);

  const del = await call('DELETE', '?email=eq.' + encodeURIComponent(PROBE));
  say(denied(del.status, await del.text()), 'DELETE still denied', del.status);

  /*  CLEAN UP WITH THE SERVICE KEY , anon deliberately cannot, which is the point of
      the two checks above. If this fails, remove the row by hand: it is the only
      thing this script leaves behind.  */
  if (process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(BASE, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await sb.from('waitlist_emails').delete().ilike('email', PROBE);
    const { count } = await sb.from('waitlist_emails').select('*', { count: 'exact', head: true });
    say(!error, 'probe row removed', error ? error.message : `${count} real rows remain`);
  } else {
    console.log('  skip   no service key , remove ' + PROBE + ' by hand');
  }

  console.log(bad ? `\n${bad} wrong.\n` : '\nthe form can add a signup, and that is all it can do.\n');
  process.exit(bad ? 1 : 0);
})();
