# THE THREE TRANSFER HALVES , SUM REPAIR (**APPLIED 2026-08-30**)

> **DONE. Option 1 chosen by Lucas: merge, club = destination.** Restore source is
> `CAPTURE_2026-08-30T07-30-45-179Z.json` (all 42 columns of all six rows, verified on disk before the write).
> The SQL actually executed is `APPLIED.sql`. Result at the foot of this file.

Douglas Luiz, Oscar Bobb and James Ward-Prowse each hold **two PL 2025/26 cards**: one correctly
keyed, one keyed to a `api_player_id` that belongs to somebody else. §E already establishes they are
two halves of one real season, not an original and a copy. This is the repair.

## 1. THE PROVIDER SETTLES IT, AND THE INTERNAL RECONCILIATION DID NOT

§E justified the repair on the minutes reconciling with the sibling , **an internal check, and §C is
explicit that our own data cannot authenticate our own data.** Re-done against API-Football's
`/players?id=&season=2025`, under the CORRECT ids, PL blocks only:

| | correct api id | provider PL blocks | sum |
|---|---|---|---|
| Douglas Luiz | 47522 | Aston Villa 613m/13ap/1g, Nottingham Forest 331m/8ap/0g | **944m 21ap 1g 0a** |
| Oscar Bobb | 278133 | Fulham 578m/14ap/0g, Man City 472m/9ap/0g/1a | **1050m 23ap 0g 1a** |
| J. Ward-Prowse | 2938 | Burnley 694m/13ap/0g/1a, West Ham 415m/5ap/0g | **1109m 18ap 0g 1a** |

**Both halves are real and both belong to the named player.** The three impostor ids , 4304 Migert
Taulla, 3651 R. Hoxha, 4696 Menaouar Benyettou , return **no 2025 season data at all**, so nothing is
being taken from anyone.

## 2. THE MERGE RULE IS ALREADY SHIPPED , DO NOT HAND-AUTHOR THE ARITHMETIC

`resolveSeasonStat()` in `api/import-players.js` is the function the importer already uses for a
genuine same-league split. Run against the live provider blocks it returns `_shape:'summed'`,
`_blocks:2`, `_gated:0` for all three. **Take its output verbatim.** It sums counting stats while
**preserving null** (NR never becomes 0), takes a **minute-weighted mean** for `rating` and
`passes_accuracy`, and takes team and position from the **richest-by-minutes** block.

**THIS ALSO SETTLES PROVENANCE.** Both halves come from one provider call, so the merged card is
single-source. **Do NOT add the stored numbers together** , the stored halves disagree with the
provider on appearances (Villa 15 vs 13, Burnley 14 vs 13) and on Bobb's minutes (579 vs 578), and
summing them would mix a stale write with a fresh read inside one field.

## 3. THE VISIBLE CONSEQUENCE, AND IT NEEDS A HUMAN NOD

Richest-by-minutes means the merged card carries the club with MORE minutes, which for all three is
**not** the club the correctly-keyed card shows today:

- Douglas Luiz: Nottingham Forest -> **Aston Villa**
- Oscar Bobb: Manchester City -> **Fulham**
- Ward-Prowse: West Ham -> **Burnley**

That is the shipped rule applied consistently, and it is still three recognisable names changing club
on the live site. Bobb's coarse position also moves **FWD -> MID**.

## 4. WHAT THE WRITE IS

Three `UPDATE`s and three `DELETE`s, one transaction.

| survives | becomes | deleted |
|---|---|---|
| 130604 (api 47522) | Aston Villa, team_id **8**, 944m 21ap 1g 0a, rating 6.89 | 108645 |
| 130484 (api 278133) | Fulham, team_id **39**, 1050m 23ap 0g 1a, rating 6.81 | 108799 |
| 130408 (api 2938) | Burnley, team_id **45**, 1109m 18ap 0g 1a, rating 6.84 | 109011 |

**`team_id` must move with `team_name`** , the view joins `teams` for the card's colours, and the
three deleted rows carry `team_id NULL`, which is why they render uncoloured. All three destination
club rows already exist (Aston Villa 8, Fulham 39, Burnley 45); no team is created.

**`starts` is ALREADY the season total on the surviving rows** (12 / 11 / 12, matching the provider's
summed lineups) while minutes and appearances are club-halves. It was filled by the keeper/starts
backfill from season totals. **Do not sum it** , the resolver's value equals what is stored.

**AND `UNIQUE (api_player_id, season, league_code)` MEANS ONE CARD IS THE ONLY LEGAL END STATE.** The
halves cannot be re-keyed into two rows; summing into one is what the constraint already implies.

## 5. WHAT IT TOUCHES DOWNSTREAM

- **rt is recomputed, because the engine reads `player_season_cards` directly.** Confirmed against a
  fresh `pg_get_viewdef`: 11,935 chars, computes `rt_new` via `percentile_cont`, and reads
  `player_season_cards` , it does **not** read `card_scores`, `card_scores_pooled`,
  `engine_stage3_rt` or `vv_final_rankings`. Those four are snapshots, already stale, and stay stale.
- **THE RIPPLE IS THE REAL COST.** Minutes on the surviving cards go 331 -> 944, 472 -> 1050 and
  415 -> 1109, and the population drops by three. Percentiles are **not partitioned by league or
  season**, so untouched cards move. **1,170 scored cards currently sit within one point of a public
  band boundary** (95/90/85/80), which is the exposed set.
- **Caches: nothing to clean.** All six cards have **zero** rows in `notes_cache` and **zero** in
  `verdict_cache`. Nothing is orphaned and nothing needs invalidating by hand.
- **`player_positions`: no rows exist for 4304, 3651 or 4696.** Nothing to delete.
- **Three orphan `players` rows** (28066, 28196, 28367) carry the forged names and, once their single
  card is gone, carry nothing. **Leave them for the `UNIQUE (source, api_player_id)` work** , they
  are evidence of the defect, and deleting them quietly is how the reason gets lost.

## 6. PROCEDURE (§C compliance)

1. Capture all six full rows to a timestamped file, read it back off disk, assert non-empty. The
   DELETEs are otherwise irreversible.
2. **Snapshot ALL scored cards from `player_card_mv` before the write** , `card_id, rt`, paginated
   past the 1000-row cap, read back and asserted row-for-row. A target-only snapshot cannot see a
   ripple.
3. Apply the three UPDATEs and three DELETEs in ONE transaction.
4. `REFRESH MATERIALIZED VIEW player_card_mv`. **SLOWER SINCE 2026-08-29** , the refresh
   now rebuilds three GIN trigram indexes (`player_name_norm`, `team_name_norm`,
   `player_name`) on top of the eight that were already there. Expected, not a fault.
5. Snapshot again and diff. **Report every untouched card that crossed 95 / 90 / 85 / 80**, and the
   three rank-anchored band counts, which must hold at 12 / 150 / 650 by construction.
6. If the ripple is unacceptable, the transaction file plus the captured rows restore the prior state.

## 7. DOC CORRECTIONS FOUND WHILE SCOPING

- **THE POPULATION IS 57,058, NOT 57,234.** `player_season_cards` and `player_card_mv` both measure
  57,058 live; 53,997 carry a non-null rt. The 57,234 figure is quoted in §C and §E and is stale.
- **`psc.rt` AND `player_card_mv.rt` DISAGREE, AND THE MATVIEW IS THE ONE THE SITE READS.** The three
  halves are rt 41 / 18 / 37 in the mv and 69 / 67 / 68 in `psc`; the survivors are 58 / 29 / 47
  against 78 / 80 / 80. §E's figures are the mv's and are correct. **`psc.rt` is a stale snapshot
  column , never quote it as the card's score.**
- **`source` SAYS `apifootball` ON ALL SIX ROWS, INCLUDING THE THREE IMPOSTOR-KEYED ONES.** The
  column does not record the namespace the id came from, which is the `UNIQUE (source,
  api_player_id)` argument demonstrated in three rows.


---

## RESULT , APPLIED 2026-08-30, FULL BEFORE/AFTER SNAPSHOT

**The club question resolved itself before the write.** Provider transfer records show all three
moved in **January 2026** and all three got MORE minutes at the club they moved to, so
richest-by-minutes and destination-club name the same club in every case. Douglas Luiz: Forest ->
**Aston Villa**. Bobb: Man City -> **Fulham**. Ward-Prowse: West Ham -> **Burnley**.

**WHAT WAS WRITTEN.** Three UPDATEs and three DELETEs in ONE anonymous `DO` block, which is how a
transaction is achieved through `exec_sql` , that RPC is a plpgsql function and `EXECUTE` takes a
single command, so six semicolon-separated statements would NOT have been atomic.

| kept | now | deleted |
|---|---|---|
| 130604 Douglas Luiz | Aston Villa, team_id 8, 944m 21ap 12st 1g | 108645 |
| 130484 Oscar Bobb | Fulham, team_id 39, 1050m 23ap 11st 1a | 108799 |
| 130408 J. Ward-Prowse | Burnley, team_id 45, 1109m 18ap 12st 1a | 109011 |

**`position` WAS DELIBERATELY NOT WRITTEN.** The resolver reports a coarse position and for Bobb it
would have moved the stored `FWD` to `MID` , a change with engine consequences, since `rel_pct`,
`defvol_pct` and `duelq_pct` partition on the coarse field. **This repair sums a split season; it
does not re-decide anyone's position.** Each surviving card keeps its verified `position_pool`
(CDM, Winger, CDM).

**THE RIPPLE, MEASURED ACROSS ALL 57,058 CARDS BEFORE AND 57,055 AFTER:**

- Population **57,058 -> 57,055**, and the three rows removed are **exactly** the three deleted.
  Zero rows appeared. Both snapshots paginated past the 1,000-row cap, ordered by a UNIQUE column,
  and asserted row-for-row off disk.
- **24 cards moved. Three are the repaired ones**: 130408 rt 47 -> **60**, 130604 rt 58 -> **64**,
  130484 rt 29 -> **31**. Each was previously scored as a part-season, which is the whole point.
- **21 untouched cards rippled, every one by exactly +/-1** (six up, fifteen down). Largest:
  130304 62->61, 130656 56->55, 130676 44->43.
- **ZERO public band crossings , touched or untouched.** Nothing crossed 95, 90, 85 or 80.
- **The three rank-anchored band counts HOLD: 12 / 150 / 650.** 80+ is unchanged at 1,406.

**AND EACH PLAYER NOW HAS EXACTLY ONE PL 2025/26 CARD**, confirmed per `api_player_id` , which is
what `UNIQUE (api_player_id, season, league_code)` always implied.

**THE ACCEPTED COST, STATED PLAINLY: each card now names ONE of the two clubs.** Douglas Luiz's card
reads "Aston Villa" for a season of which 331 minutes were played at Forest. That is what one card
per player-season forces, it is permanent, and it applies to roughly 1,600 more halved cards.
**Whether a card may ever name two clubs is logged as its own platform decision in `POST_LAUNCH.md`
, it is not a repair question.**

**REVERSIBLE.** No foreign key points at `player_season_cards`; `id` defaults from a sequence and is
NOT an identity column, so the three deleted rows can be re-inserted with their original ids from
the capture file. Zero rows existed in `notes_cache`, `verdict_cache` or `player_positions` for any
of them.
