/*  ITEM 10 , CONTROL SET FOR THE SHARE FRAME'S VERDICT TYPOGRAPHY (2026-10-03).
    Run: node scripts/share10_control.js
    Every check is exercised on the COMPOSED output of vvShareFrameHTML rather than on
    shVerdictHTML directly , SS C: verify on the composed artefact, never on the source.
    The one that earned its keep is the keeper case: Number(null) is 0, not NaN, so the first
    guard passed an unscored card and printed "91 points". Caught here, not by reading.  */
'use strict';
global.window = global;
const V = require('../vv-core.js');
const F = { key:'x', name:'X', w:1200, h:675 };
const card = (full, vv, season) => ({ full, vv, season: season || 2011, team_name:'Club',
  pos:'ST', player_name: full, league_code:'PL' });
const spec = (verdictLine, winner, a, b) =>
  ({ kind:'compare', a, b, winner, verdictTag:'The Debate', verdictLine });
const emph = h => { const m = h.match(/<span class="sf-vem">([^<]*)<\/span>/); return m ? m[1] : null; };
const chipOf = h => (h.match(/sf-margin[^>]*>([^<]*)</) || [])[1] || null;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n + (d ? '   ' + d : '')); }
                           else   { fail++; console.log('  FAIL  ' + n + (d ? '   ' + d : '')); } };

const A = card('Lionel Messi', 96), B = card('Erling Haaland', 91, 2022);
const F_ = (l, w, a, b) => V.vvShareFrameHTML(spec(l, w, a || A, b || B), F, false);

console.log('\n── the emphasised phrase is structural ──────────────────────────');
chk('winner surname is marked', emph(F_('Messi edges it on the record.', 'A')) === 'Messi');
chk('a tie marks nobody', emph(F_('Messi edges it.', 'tie')) === null);
chk('absent surname gets no emphasis (the 2 of 72)', emph(F_('Neither season gives way.', 'A')) === null);
chk('an ACCENTED surname is marked (the \\b blind spot)',
    emph(F_('Mbappé takes it late.', 'A', card('Kylian Mbappé', 93))) === 'Mbappé');
chk('a surname inside a longer word is NOT marked', emph(F_('Messiah complex aside.', 'A')) === null);
{ const h = F_('Messi <b>wins</b> & settles it.', 'A');
  chk('model output is escaped and injects no markup',
      h.indexOf('<b>wins</b>') < 0 && h.indexOf('&lt;b&gt;') > 0 && emph(h) === 'Messi'); }

console.log('\n── the scoreline and the margin chip ────────────────────────────');
{ const h = F_('Messi edges it.', 'A');
  chk('the chip names the GAP and never the victor',
      chipOf(h) === '5 points' && !/sf-margin[^>]*>[^<]*Messi/.test(h), chipOf(h));
  chk('the loser dims and the winner does not',
      (h.match(/sf-score sf-lose/g) || []).length === 1 && /sf-score" [^>]*>96</.test(h)); }
{ const h = V.vvShareFrameHTML(spec('Level.', 'tie', card('Lionel Messi', 96), card('Cristiano Ronaldo', 96, 2012)), F, false);
  chk('a tie dims NEITHER side', (h.match(/sf-lose/g) || []).length === 0);
  chk('a tie reads Level', chipOf(h) === 'Level', chipOf(h)); }
{ const h = V.vvShareFrameHTML(spec('Level by one.', 'A', card('Lionel Messi', 96), card('Cristiano Ronaldo', 95, 2012)), F, false);
  chk('one point is singular', chipOf(h) === '1 point', chipOf(h)); }
{ const h = F_('Neuer.', 'A', card('Manuel Neuer', null, 2013));
  chk('an unscored keeper yields NO chip rather than a coerced zero',
      h.indexOf('sf-margin') < 0 && h.indexOf('NaN') < 0 && h.indexOf('91 points') < 0); }

console.log('\n── the chrome ──────────────────────────────────────────────────');
{ const h = F_('Messi edges it.', 'A');
  chk('handles render, once, top left', (h.match(/@vvonderxi/g) || []).length === 1 && /sf-handles/.test(h));
  chk('both marks are inline SVG with no <use> (the capture drops <use>)',
      /sf-handles[\s\S]{0,900}<svg/.test(h) && !/sf-handles[\s\S]{0,900}<use/.test(h));
  chk('the caption row survives, so the image still names both seasons',
      /sf-cap/.test(h) && /sf-capwrap/.test(h)); }

console.log('\n' + (fail ? '  ' + fail + ' FAILED, ' : '  ') + pass + ' of ' + (pass + fail) + ' checks pass\n');
process.exit(fail ? 1 : 0);
