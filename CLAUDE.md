# VVonderXI , LOCKED SPEC (read FIRST, every session, in full)

**This is not a handover.** It is the flat list of decisions that must NEVER be re-derived or "discovered" fresh. If a chat proposes something that contradicts an item here, the chat is wrong, not the spec. Handovers carry task state; THIS carries the invariants.

**First action, every chat / Claude Code session:**
1. Read this whole file.
2. Confirm the load-bearing items (§3) back before proposing anything.
3. Then read the task handover.
4. Verify against LIVE code/DB before editing , docs drift, including this one. Distinguish "verified live this session" from "asserted by a doc."

**Where this lives:** repo root as `CLAUDE.md` (Claude Code reads it automatically) AND in project knowledge. Update it at the END of every session that changes an invariant , one line, immediately, not "later."

---

## 1. SAFETY / WORKFLOW (never bypass)
- Branch `redesign-compare`. Production `vvonderxi_BIGGER` is NEVER touched directly. First command each session, Terminal C: `git log --oneline -4` , confirm the expected tip before any work.
- **Two terminals, strict:** Claude Code (Terminal A) = edits / SQL / commits, and NEVER pushes. Terminal C (plain) = reads / verify / push. **Lucas pushes, always.** Label every command with its terminal.
- **View / engine changes go through the Supabase SQL editor**, method: `pg_get_viewdef('player_card_view', true)` -> edit ONLY the target lines -> `create or replace view` -> `refresh materialized view player_card_mv`. NEVER hand-retype engine SQL. `create or replace view` can only APPEND columns , preserve column order exactly. "Success, no rows" is correct for DDL.
- Byte-verify every repo edit in Terminal C before commit. `node --check` FAILS on `.html` (Node v22). Stage NAMED files only , never `git add .` (scratch stays untracked: `api/probe-*.js`, `getVVTags_v1_draft.js`, `tags_test.csv`).
- No em/en dashes anywhere , spaced comma ( , ). NR ("Not Recorded") for missing data, never "0".

## 2. STACK FACTS
- Supabase project `krqthvroetbxgnvwwjar`. Canonical view `player_card_view` (holds the WHOLE VV Score engine). Matview `player_card_mv` (site reads this). **Refresh the matview after every view change or import** , live anchors recompute at refresh, not per query.
- Vercel serverless functions terminate after `res.json()` , do DB writes BEFORE sending the response.
- SQL editor display cap = 100 rows; use explicit `LIMIT` > total for full exports. Always a NEW query window.

## 3. THE ENGINE / BAND SYSTEM (this is where chats keep failing , read twice)
- **Band architecture: `bandFor` in `vv-core.js` emits 9 internal bands. The PUBLIC ladder shows the top 4 named + 1 grouped.** Do NOT "collapse `bandFor` to 5" , the 9 are intentional (feed tags/colour). The 5-card public ladder lives in the DISPLAY layer.
- **Public labels are RENAMES of engine strings, not the engine strings themselves:** engine `"Exceptional"` (rt>=76) displays PUBLICLY as **"Standout"**. The grouped lower field (75 and under) displays as **"Accomplished , the honest backbone of the professional game."** `bandFor`'s internal names are NOT the user-facing labels.
- **Public 5-band ladder:** Generational / Elite / World Class / Standout / Accomplished. Definitions are authored copy (Henry Winter voice) , do not rewrite them casually.
- **Generational = `bandFor(rt) >= 95`, pure rt function, no output gate in code.** Output rarity is guaranteed by the calibrated output-first scale (you cannot reach rt 95 without elite output; verified: top 12 seasons are all 40-50 goal campaigns). Two coupled places for band thresholds: `bandFor` in `vv-core.js` and the ladder display numbers in `vvindex.html`/`playbook.html`.
- **Two badges only.** Generational badge = Generational band ONLY. Iconic badge = Elite band. None below. `prestigeFor`: `Generational->Generational, Elite->Iconic, else null`. S-Tier is RETIRED everywhere , do not reintroduce it.
- **ANCHOR GUARDRAIL:** bands and scores derive from LIVE top-N anchors (subqueries inside the view), never hardcoded numbers, never tuned until a famous name lands where wanted. **Famous names are a READ-OUT (validity check on the design), never a DIAL (a target).** Greatness shows as DENSITY in the elite band, never as any single card being #1.
- Recalibrate the engine by EDITING THE VIEW, never by re-import. All `rt` is provisional until final calibration.
- **GK capped at 75** pending keeper-stats import (v1.2). Defenders scored in their own pool with data-confidence disclosure as the bridge; proper defensive-stats import is the destination. Do NOT hand-boost either , score honestly or disclose the gap.

## 4. SEARCH (permanent architecture , high miss-risk)
- **TWO search paths, NO shared code:** (a) `rankings.html` queries matview `player_card_mv` directly via `player_name_norm`/`team_name_norm`; (b) Compare / `api/search-player.js` calls Postgres RPC `search_players(q)`. **Any matching/normalization change MUST be applied to BOTH or they diverge.**
- **Display name vs search name are separate:** `players.name` = short display ("E. Haaland", KEEP short); `players.full_name` = full, hidden, search-only. Normalization rule (identical both paths): `regexp_replace(lower(unaccent(coalesce(full_name,name))), '[^a-z0-9 ]', '', 'g')`.

## 5. HOW LUCAS WORKS
- Solo non-coder, voice-to-text (read for intent, not literal). Decisions/options FIRST, concise, no essays. Tappable choices when picking options. ONE pasteable block at a time. Demo-first on any multi-option design choice (show it, pick once, build once). Test the live preview at 390px after any UI-affecting push. Lucas is a separate instance from the terminals , he pastes Terminal C output and query results back.

## 6. VERIFIED LIVE THIS SESSION (2 Jul 2026, branch tip `7c73d65`)
- GK scoring is NOT broken: live GK max rt = 75, avg 58.1, ZERO keepers >= 88. The "backup above Messi" report was a STALE matview read; the calibration commit `19b9c22` + the search-RPC refresh already fixed it. Task 1 = verify-and-close, no view change.
- Live distribution (matview): 95+ = 12, 90-94 = 138, 85-89 = 500, scored = 53,485, null = 2,969 (all sub-300-min), avg = 56.3, range 15-100.
- Elite-assist check PASSED: all 6 seasons with assists>=20 sit at rt 85+. The `0.7` assist weight is fine , do not touch it.
- `bandFor` thresholds re-cut to the recalibrated scale (95/90/85/80; lower four 68/58/45/30 unchanged). Coupled only to the ladder display numbers in `vvindex.html` / `playbook.html` , no `rowToCard` gate exists.

## 7. CONFIRM LIVE BEFORE RELYING ON THESE (asserted by docs, not yet re-verified this session)
- The exact `rowToCard` Generational-gate line and the "Exceptional -> Standout" / "Accomplished" display-mapping location. Read `vv-core.js` around lines 540-560 and the display layer live before editing either.
- Whether `vvindex.html` / `playbook.html` still show a stale "50 to 96" range or empty ladder (master items S6/P12) , may already be resolved; verify on the live preview.

---

**Update discipline:** when a decision is locked, deferred, or verified, add/edit ONE line here immediately. This file only works if it stays current , a stale locked-spec is the exact failure it exists to prevent.
