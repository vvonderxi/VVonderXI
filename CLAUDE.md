# VVonderXI , MASTER SOURCE OF TRUTH (read this FIRST, every session, in full)

**This is the ONE reference point.** If any other document, memory, or assumption conflicts with this file, THIS FILE WINS. When you are unsure about anything , a decision, a convention, the state of the work , the answer is here. Do not re-derive decisions already recorded here. Do not trust a summary of this file; read the file.

**First actions, every session:**
1. Read this whole file.
2. Read the PROGRESS graphic (below) to orient on where the project stands.
3. Confirm the load-bearing invariants (§C) back to Lucas before proposing anything.
4. Check the SESSION LOG (§F) for what the last few sessions did.
5. Verify against LIVE code/DB before editing , docs drift, including this one. Distinguish "verified live this session" from "recorded in this doc."
6. At session END: append a SESSION LOG entry (§F) and update the PROGRESS graphic. A session that changes state but doesn't log it has failed the next chat.

Why this file exists: this project has suffered from too many documents and no clear reference point , chats rediscovering settled decisions, contradicting each other, losing work. This file is the fix. It is authoritative, current, and self-maintaining. Keep it that way.

---

## A. PROGRESS (update the bars every session)

```
=== VVONDERXI LAUNCH PROGRESS ===
Data quality   ████████████████░░  ~90%   top band nearly done; ~18k coarse tail = v2
Tags           ██░░░░░░░░░░░░░░░░   ~10%   system exists, unvalidated; honours pending
Compare        █░░░░░░░░░░░░░░░░░   ~5%    hardcoded
Card editorial ███░░░░░░░░░░░░░░░   ~15%   layout done, editorial half unwired
Hygiene        ███░░░░░░░░░░░░░░░   ~20%   key rotation, meta, logo, QA outstanding
Merge          ░░░░░░░░░░░░░░░░░░    0%    redesign-compare -> vvonderxi_BIGGER
```
LAUNCH = tags + Compare + card editorial + hygiene + merge. **Data quality is a supporting layer, NOT a blocker** , launch bar is "top band clean + tail honestly flagged via confidence dots", not 100% of 56k cards. The seductive trap is endless data-polish while Compare stays hardcoded. After honours, the center of gravity MUST shift from data to the tag->Compare product spine.

Bar legend: each block ~5.5%. Update honestly , overstating progress hurts the next chat.

---

## B. HOW LUCAS WORKS (apply every session)

- **Solo non-coder founder.** Voice-to-text input , read for INTENT, not literal transcription (typos/run-ons are normal).
- **Wants:** decisions and options FIRST, concise, no essays. Tappable/numbered choices when picking between options. ONE pasteable block at a time. Tell him EXACTLY what to paste and WHERE (Supabase SQL editor / Claude Code / Terminal C) , he is not technical, so "here's the SQL, paste it in Supabase" beats "run a query to check X". When giving steps, give the literal command, labelled with its destination.
- **Think like a senior engineer + statistician + architect.** Be decisive, don't flip-flop, don't hedge. Flag the better option and say why. Don't drag , if stuck or confused, READ THE LIVE FILES / THIS DOC rather than guessing or looping.
- **Two-terminal discipline (STRICT):** Claude Code (Terminal A) = edits/SQL/commits, NEVER pushes. Terminal C (plain) = reads/verify/push. Lucas pushes himself, always. Label every command's terminal.
- **Demo-first:** on any multi-option design choice, show it before building. Pick once, build once.
- **Honesty standard:** explicit when something is genuinely incomplete vs done. Recommend the best path, don't conservatively hedge. Own mistakes plainly, no grovelling.
- Lucas is a separate instance from the terminals , he pastes Terminal C output and query results back into chat.
- No em/en dashes anywhere (spaced comma). NR for missing data, never 0.

---

## C. LOCKED INVARIANTS (never re-derive; contradicting these = the chat is wrong)

**Safety/workflow**
- Branch `redesign-compare`. Production `vvonderxi_BIGGER` NEVER touched directly. First command each session, Terminal C: `git log --oneline -4`.
- View/engine changes via Supabase SQL editor: `pg_get_viewdef` -> edit only target lines -> `create or replace view` -> `refresh materialized view player_card_mv`. NEVER hand-retype engine SQL. **ALWAYS build view edits from a FRESH pg_get_viewdef, never the repo `new_view.sql` copy , it has drifted repeatedly.** `create or replace view` can only APPEND columns; preserve column order.
- Byte-verify edits in Terminal C before commit. `node --check` FAILS on .html. Stage named files only, never `git add .`.

**Stack**
- Supabase project `krqthvroetbxgnvwwjar`. View `player_card_view` (holds the whole VV engine). Matview `player_card_mv` (site reads this) , REFRESH after every data/view change. SQL editor caps display at 100 rows. Vercel serverless terminates after res.json() (writes before response).

**Engine / bands**
- `bandFor` (vv-core.js) emits 9 internal bands; PUBLIC ladder = top 4 named + 1 grouped. Public labels are DISPLAY renames: engine "Exceptional" shows as "Standout"; grouped lower field shows as "Accomplished". Do not collapse the 9.
- Band thresholds (recut to recalibrated scale, live): Generational 95, Elite 90, World Class 85, Standout(=Exceptional) 80. Lower internal bands unchanged. NO Generational output gate exists , rarity is guaranteed by the output-first scale (can't reach 95 without elite output). Two coupled threshold places: bandFor + ladder display numbers (vvindex.html, playbook.html).
- **Top-of-scale cap LIVE:** no card scores 100. Top piecewise segment compressed 95-100 -> 95-97 (else-line 2.0 not 5.0). Messi 11/12 = 97 (ceiling). Pantheon clusters as peers 95-97; ties allowed.
- Two prestige badges only: Generational badge = Generational band; Iconic = Elite band. S-Tier retired.
- **ANCHOR GUARDRAIL:** bands/scores derive from LIVE top-N anchors, never hardcoded, never tuned until a famous name lands where wanted. Famous names are a READ-OUT (validity check), never a DIAL. Greatness = density in the elite band, not any single #1.
- GK capped at 75 (pending keeper-stats). Defenders scored in own pool; disclose via confidence, don't fake.

**Search (two separate paths, no shared code)**
- rankings.html queries matview directly; Compare/api uses RPC `search_players`. Any matching/normalization change goes to BOTH. Normalization: `regexp_replace(lower(unaccent(coalesce(full_name,name))), '[^a-z0-9 ]','','g')`.

**Position system (LOCKED 8 buckets)**
- Every card resolves to exactly one of: **GK, FB, CB, CDM, CM, CAM, Winger, ST**. No LW/RW split.
- Map: RB/LB/wing-back->FB; DM->CDM; central mid->CM; AM/true #10 orchestrator->CAM; RW/LW/wide-forward->Winger; ST/CF/second-striker->ST. Ambiguous forward: goal-scoring->ST, wide->Winger, orchestrating->CAM; judge by role played MOST that season.
- shirt_number + position live in `player_positions` (PK: api_player_id, season_year, league_code; position + shirt_number nullable). NO pre-2016 rows exist -> pre-2016 needs INSERT (guarded), not UPDATE. Card reads pp.position (via position_pool), falls back to coarse psc.position (DEF/MID/FWD/GK) when no pp row.
- API-Football's auto-imported positions have a SYSTEMATIC bug: attacking mids + wingers dumped into "CM" (De Bruyne, Mbeumo, Bruno, Palmer, Pepe, Olise). Trust Transfermarkt/CCC-verified data OVER the auto-map.

**Honours = a TAG family (tier: Prestige -> Honours -> Performance)**
- Season honour tags (6): League Champion (ONE reused tag, team-season lookup), UCL Winner, Ballon d'Or, Golden Boot, Top Assists, Player of the Season.
- Player-LEVEL accolades (career context for Commentator's Notes + verdicts, NOT season tags): World Cup Winner, etc.
- Excluded from season tags: domestic cups. Data is table-shaped (Wikipedia), ~500-800 rows. Build as first piece of tag validation.

**Provenance**
- Assists = FBref domestic-league. Shirt+position = Transfermarkt. Don't mix within a field.

---

## D. CURRENT STATE / ACTIVE TASK

**Active:** Top-150 position+shirt+assist verification sweep (CCC/Chrome). Rows 1-52 (famous players) skipped as pre-verified; rows 53-150 being re-verified in ~20-row batches (data was lost to summarization once , batches now output immediately). Also completes the 81 NR-assist top-band seasons (subset of 150). After all 150 collected -> one upsert -> refresh -> top-band distribution re-check (assists move rt; 97-cap self-corrects on anchors).

**Then:** honours -> TAG VALIDATION -> Compare -> card editorial -> hygiene -> merge.

---

## E. BACKLOG / HORIZON (not launch-blockers unless marked)

- **LAUNCH-BLOCKERS:** tag validation; Compare build; card.html editorial (Proof/Wonder Tags/Notes); API-Football key rotation (exposed); og/meta + social image; contact-form endpoint (errors); OAuth published; 390px QA; merge to vvonderxi_BIGGER.
- **Quality (not blockers):** ~18k coarse-position tail (v2 script); shirt/position tail below rt85; Ibra 15/16 ordering wrinkle (47.1 output at 94, tier-map not monotonic at top seam , engine session); rankings A-Z sort bug; result-cap raise (250-500, "showing X of Y"); Data Confidence expandable panel; season-switcher; card hero text overflow.
- **Post-launch:** accounts/Locker (waitlist now); language toggle EN/NL/FR.

---

## F. SESSION LOG (append-only; newest at top; NEVER rewrite past entries)

Each session appends: date | chat/task | what was done | status | anything the next chat must know.

### 2026-07-03/04 | Engine cleanup + data enrichment (this session)
- Bands re-cut to 95/90/85/80 (commit 18c6059). GK "blocker" closed (stale read, not a bug). Elite-assist check passed (0.7 weight kept).
- 101 assists backfilled (22 marquee + 79 World Class), FBref domestic, verified.
- Top-of-scale cap BUILT + LIVE (commit ebc8ce6): 95-100 -> 95-97, Messi 11/12 = 97. Also fixed new_view.sql norm-drift.
- Tagline -> "Every Season Tells a Different Story" site-wide (commit 480390b).
- Rankings rt-ceiling bug fixed 96->97 across 11 coupled spots (commit f7745d3) , top-of-scale seasons were being filtered out.
- Position auto-map: ~37,700 cards standardized to 8 buckets (format only; inherited API-Football accuracy errors).
- Verified by hand: top 40 + 100 = 140 cards shirt+position (Transfermarkt).
- Honours specced as a tag family. Progress-graphic + this master-doc structure established.
- IN PROGRESS at session end: top-150 verification sweep (CCC), ~50 of 97 rows collected, write pending.
- STATUS: engine clean and trustworthy; top band nearly fully enriched; NEXT is finish 150 -> honours -> tags.

---

**Update discipline:** when a decision is locked/deferred/verified, edit the relevant section immediately. Append to §F every session. Update §A bars every session. A stale master doc is the exact failure this file exists to prevent.
