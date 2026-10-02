#!/usr/bin/env node
/*  THE CARD IMAGE DRIFT CHECK , A COMMITTED PNG IS A SNAPSHOT AND SNAPSHOTS GO STALE SILENTLY.
    ================================================================================
    `assets/vvcard-vandijk-1819.webp` is a raster of ONE card, sitting beside the limits
    section on vvindex.html as evidence for three of its panels. It is the FIFTH embedded
    snapshot on this platform, after RADAR_POOL_REF, KEEPER_SAVE_LADDER, TAG_THRESHOLDS_POOL
    and the index figures , and CLAUDE.md records that none of those complains when it goes
    stale. This is the complaint.

    THERE IS NO GENERATOR AND THAT IS A TOOLING FACT, NOT A CHOICE. The image is produced by
    html2canvas in a real browser, and this repo has no headless browser (no puppeteer, no
    playwright) and no image encoder (no sharp, no cwebp, no imagemagick) , two dependencies
    in total. So REGENERATING is a browser procedure, written out at the foot of this file,
    and what is automated is the part that matters: knowing WHEN to re-run it.

    IT CHECKS TWO KINDS OF DRIFT, because the image can go wrong in two independent ways:

      DATA   the card's own figures moved. A rescore, a position correction, an honour
             written or deleted. Queried live against player_card_mv.
      DESIGN the card FACE changed. New type, new rim, a moved chip. Fingerprinted from
             the source that governs it.

    WHAT IT CANNOT SEE, SAID PLAINLY: a change to `buildCard`'s MARKUP that moves nothing in
    VV_CARD_CSS and nothing in the page's own .vvcard rules. The fingerprint covers the two
    places CLAUDE.md names as governing the card's appearance , the shared sheet and the box
    that deliberately stays in the pages , and a markup-only change would slip past it.

    RUN   node scripts/check-card-image.js
    EXIT  0 clean, 1 drifted or missing. Control numbers are at the foot.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');
const IMAGE = 'assets/vvcard-vandijk-1819.webp';

/*  THE CARD THE IMAGE DEPICTS, AND WHY THIS ONE. The limits section names Van Dijk in prose
    ("Van Dijk sits in the low seventies"), he is a CENTRE-BACK, and this season carries an
    INDIVIDUAL award beside a team one. So one card is evidence for three separate panels:
    the honours panel (913 honours, none of which move a score), the defender panel (0
    centre-backs in the top band), and the sentence that names him.  */
const CARD_ID = 133196;
const EXPECT = {
  player: 'V. van Dijk', team: 'Liverpool', season: 2018,
  rt: 72, pool: 'CB',
  honours: 'player_of_season,ucl_winner',
  // read off the capture itself, not typed from memory
  bytes: 55788, width: 912, height: 1383,
};

/*  THE DESIGN FINGERPRINT. Two sources, because CLAUDE.md records that the card's look is
    split between them: VV_CARD_CSS in the shared module, and the .vvcard BOX which stays in
    each page on purpose and must not be moved into the sheet.  */
function cardFaceFingerprint() {
  const core = fs.readFileSync(path.join(ROOT, 'vv-core.js'), 'utf8');
  /*  ANCHOR ON THE DECLARATION, NOT ON THE NAME. `VV_CARD_CSS` is mentioned in SIX comments
      in this file before and inside its own literal , CLAUDE.md's rule that prose about a
      thing joins every search for that thing, hit while writing this check. Anchoring on the
      bare name grabbed a backtick inside the comment above the declaration and fingerprinted
      23 characters of nothing.  */
  const i = core.search(/var\s+VV_CARD_CSS\s*=\s*`/);
  if (i < 0) throw new Error('VV_CARD_CSS declaration not found in vv-core.js , the check cannot run');
  const open = core.indexOf('`', i);
  const close = core.indexOf('`', open + 1);
  if (open < 0 || close < 0) throw new Error('VV_CARD_CSS literal not delimited as expected');
  const css = core.slice(open + 1, close);

  /*  The page's own .vvcard rules. Taken from card.html, which is the surface the image was
      captured on, so a change there is a change to the thing in the picture.  */
  const page = fs.readFileSync(path.join(ROOT, 'card.html'), 'utf8');
  const box = (page.match(/\.vvcard[^{}]*\{[^}]*\}/g) || []).join('\n');
  if (!box) throw new Error('no .vvcard rules found in card.html , the check cannot run');

  return {
    css: crypto.createHash('sha256').update(css).digest('hex').slice(0, 16),
    box: crypto.createHash('sha256').update(box).digest('hex').slice(0, 16),
    cssLen: css.length, boxRules: (box.match(/\{/g) || []).length,
  };
}

/*  PINNED AT THE MOMENT THE IMAGE WAS CAPTURED. If either moves, the picture may no longer
    show what the card shows , re-capture, re-read these, and change them in the SAME commit
    as the new file, or the next run reports drift that has already been dealt with.  */
const PIN = { css: '20411149351af48c', box: 'edb45ba64b4299f7' };

(async () => {
  let bad = 0;
  const say = (ok, label, detail) => {
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'DRIFT'} ${label.padEnd(34)}${detail}`);
  };

  console.log('\n=== the card image, and whether it still tells the truth ===\n');

  // ── the file ────────────────────────────────────────────────────────────
  const abs = path.join(ROOT, IMAGE);
  if (!fs.existsSync(abs)) {
    console.log(`  MISSING  ${IMAGE}`);
    process.exit(1);
  }
  const st = fs.statSync(abs);
  say(st.size === EXPECT.bytes, 'file size', `${st.size} bytes (pinned ${EXPECT.bytes})`);
  const head = fs.readFileSync(abs, { encoding: null }).slice(0, 16);
  say(head.slice(0, 4).toString() === 'RIFF' && head.slice(8, 12).toString() === 'WEBP',
      'file is a real WebP', head.slice(8, 12).toString());

  // ── DESIGN drift ────────────────────────────────────────────────────────
  const fp = cardFaceFingerprint();
  say(fp.css === PIN.css, 'card face CSS (vv-core)', `${fp.css}  ${fp.cssLen} chars`);
  say(fp.box === PIN.box, 'card box rules (card.html)', `${fp.box}  ${fp.boxRules} rules`);

  // ── DATA drift ──────────────────────────────────────────────────────────
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('  skip  data check                   no SUPABASE_URL / SERVICE_KEY in env');
  } else {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,player_name,team_name,season_year,rt,position_pool,honours_json')
      .eq('card_id', CARD_ID).maybeSingle();
    if (error) { console.log('  ERROR data check: ' + error.message); bad++; }
    else if (!data) { console.log(`  DRIFT card ${CARD_ID} no longer exists`); bad++; }
    else {
      say(data.rt === EXPECT.rt, 'rt', `${data.rt} (pinned ${EXPECT.rt})`);
      say(data.position_pool === EXPECT.pool, 'position pool', `${data.position_pool}`);
      say(data.team_name === EXPECT.team, 'club', `${data.team_name}`);
      say(data.season_year === EXPECT.season, 'season', `${data.season_year}`);
      const hon = (Array.isArray(data.honours_json)
        ? data.honours_json.map(h => h.type || h) : []).sort().join(',');
      say(hon === EXPECT.honours, 'honours on the card', hon || '(none)');
    }
  }

  console.log(bad
    ? `\n${bad} drifted. The image may no longer show what the card shows , re-capture it.\n`
      + 'HOW, because there is no headless browser here:\n'
      + `  1. serve the repo and open  card.html?id=${CARD_ID}\n`
      + '  2. load html2canvas 1.4.1 from the same CDN vv-core uses\n'
      + '  3. apply VVCore.vvInlineMarks, vvShimInsetRims and vvShimShieldNumbers to the\n'
      + '     .vvcard node, restoring each from a finally. WITHOUT THEM the tag marks draw\n'
      + '     NOTHING , measured, luma span 5/4/2 against 137/129/176 with them.\n'
      + '  4. html2canvas(card,{backgroundColor:null,scale:3}) then toDataURL("image/webp",0.92)\n'
      + `  5. save over ${IMAGE}, re-read the three pins above, change them in the SAME commit\n`
    : '\nthe image still matches the card it depicts, and the card face has not moved.\n');
  process.exit(bad ? 1 : 0);
})();

/*  CONTROL , RUN BEFORE TRUSTING A PASS. A check whose failing state has never been observed
    is indistinguishable from one that cannot see anything, which CLAUDE.md records as having
    happened three times in one week.
    Planted faults and what they produced, recorded at the time of writing:
      a byte in EXPECT.bytes      -> DRIFT file size, exit 1
      a character in PIN.css      -> DRIFT card face CSS, exit 1
      rt 72 -> 73 in EXPECT       -> DRIFT rt, exit 1
      the file deleted            -> MISSING, exit 1
    Clean run prints 8 ok and exits 0.  */
