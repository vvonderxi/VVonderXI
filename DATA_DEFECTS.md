# DATA DEFECTS , THE EVIDENCE (split out of `CLAUDE.md` §E, 2026-08-29)

**THE RULES AND THE DECISIONS DID NOT MOVE. They are still in §E, as the bold headlines they always
were.** Only the forensic detail behind them left, because §E had reached 18.3% of the truncation
limit on its own and §C could no longer be relieved by archiving. **This is the `SILENT_FAILURES.md`
shape applied to the data track.**

**Open this file when a data defect needs re-litigating** , when you are about to write to a
suspect block, when a count disagrees with what §E records, or when someone proposes deleting rows
because they look like duplicates. **You do not need it to work.** §E carries the decision; this
carries why.

**`CLAUDE.md` WINS ON ANY CONFLICT.**

---

- **THE PL 2025/26 BLOCK IS CORRUPT, AND A COARSE-VERSUS-POOL CROSS-CHECK CANNOT FIND IT, BECAUSE BOTH FIELDS AGREE AND BOTH ARE WRONG (found 2026-08-21, read-only, NOT fixed).** **185 cards carry `card_id < 120000`. Every one is season 2526; 181 are PL.** Inside that block the pool-versus-coarse contradiction rate is **45.24%, against a 12.52% baseline across the rest of the database** , 3.6x, which is how it was noticed at all.
  - **THE ROWS ARE ATTACHED TO THE WRONG PLAYER, so neither position field is the defect.** `card_id 108874` is **Diogo Costa (api 369) at Leeds in 2526 with 2,378 minutes, 5 goals and 3 assists**, while `card_id 163439` has the same api id at FC Porto in the same season with 2,907 minutes and 0 goals. **One player, one season, two clubs, 5,285 minutes, and five goals from a goalkeeper.** Same shape for `İ. Çipe` (api 428), a Kayserispor and Galatasaray keeper appearing at Crystal Palace.
  - **THE CROSS-CHECK IS BLIND EXACTLY WHERE IT MATTERS MOST. `Alex Telles` is stored coarse GK AND pool GK for Leeds 2526 over 1,980 minutes**, so he passes every consistency test we have and is **SCORED ON THE GOALKEEPER BRANCH AND CAPPED AT 75**. He is a left-back. **A test that asks whether two fields agree can only find disagreement; it is silent when a row is wholly someone else's.** Also in the block: **Eder Militao at Leeds, coarse FWD, 6 goals** (a Madrid centre-back), and **F. Chalov as Manchester City's keeper over 3,060 minutes.**
  - **CORRECTION, SAME DAY: IT IS SYSTEMATIC, NOT PARTIAL, AND THE FIRST READING WAS WRONG IN AN INSTRUCTIVE WAY.** The original entry said the block was partial because *"Pickford at Everton, Leno at Fulham and Verbruggen at Brighton are all correct in the same block"*. **They are not correct. `api 803` renders as `Jordan Pickford` in our database and the provider says it is `L. Pernica`.** **Plausibility was judged against our own `players` table, which is one of the two corrupted layers**, so the check was reading the forgery to authenticate the forgery. Sampled 12 cards spread across the block against the provider: **10 of 12 carry a name that is not that `api_player_id`'s player**, and the 2 that matched on name still sit at impossible clubs (Tolisso at Aston Villa, Kvaratskhelia at Brighton). Six checked in depth against provider season data were wrong on the club, every one.
  - **THE CORRUPTION HAS TWO LAYERS, WHICH IS WHY IT LOOKS SO CONVINCING.** The `players` rows carry the WRONG NAME for these `api_player_id`s, and the cards carry the WRONG CLUB. The mis-named ids each have exactly ONE card , the block card , so those player rows exist only to carry it. **The block does not contain garbled names; it contains familiar Premier League names attached to other people's ids.**
  - **THE CHECK THAT WORKS IS CLUB-VERSUS-PLAYER, NOT FIELD-VERSUS-FIELD** , did this player actually play for this club in this season. Minutes summing past a season across two clubs is a second one, and goals from a pooled goalkeeper a third. **All three are external to the position fields, which is the point.**
  - **ALMOST CERTAINLY THE SAME DEFECT AS THE PARKED WRONG-BLOCK PASS** (`INGESTION_RECOVERY.md`, PL census 109 rows), surfacing in the live season. **DO NOT WRITE ANYTHING HERE ON THE STRENGTH OF THE POSITION FIELDS.** The `rel_pct` repartition and the GK branch-gate change are both PARKED behind this , gating the branch on `COALESCE(pool, pos)` would cap a corrupt outfield season at 75 and make bad data look plausible instead of odd.

---

- **SAME-LEAGUE MID-SEASON TRANSFERS ARE STORED AS ONE HALF ON ROUGHLY TWO THIRDS OF SPLITS, AND THE CAUSE IS STALE DATA, NOT THE CURRENT RESOLVER (measured 2026-08-23, NOT repaired).** Measured against the provider across three league-seasons: **34 of 51 genuine splits are halved , PL 2023/24 7 of 12, PL 2025/26 9 of 13, SA 2023/24 18 of 26.** Worst: **Semenyo 1,798 of 3,200 minutes, Guehi 1,800 of 3,150, B. Johnson 628 of 1,752.** Extrapolated at ~11 per league-season over 144, the order is **~1,600 cards** , an ORDER FROM A THREE-SEASON SAMPLE, NOT A COUNT.
  - **THE RESOLVER IS NOT THE CAUSE. Run against the real provider blocks for all 51 splits it sums 48, and 49 after the `sharesStat` fix.** The stored rows were written by an EARLIER version of the summing path and are stale relative to the code. **So the repair is a RE-RUN, not a code change** , and quoting the stored halving rate as a resolver defect overstates it, which an earlier version of this entry did.
  - **THE ONE REAL RESOLVER DEFECT, now fixed: `sharesStat` fired on ONE matching stat.** It required `(goals >= 3 AND equal) OR (assists >= 3 AND equal)` plus `minuteRatio >= 0.5`. **A duplicated block is a COPY and agrees on EVERYTHING; a genuine transfer matching on ONE stat is coincidence.** Measured: **Belotti SA 23/24, Roma 686m/14ap/3g/2a + Fiorentina 958m/15ap/3g/0a** , goals matched at 3, everything else differed, and he was deduped to one club, losing 686 minutes. Now requires BOTH to agree with one informative. **`sharesStat` was the SOLE trigger on ZERO of 16 artefact pairs, so tightening it costs no artefact detection.**
  - **TWO OF THE THREE MISSES WERE THE GUARD WORKING, NOT FAILING.** Smith Rowe (Arsenal 13ap + Fulham 31ap = 44) and Osula (Sheffield Utd 21ap + Newcastle 30ap = 51) exceed the 38-game league cap, so `isArtifact` test (A2) `sumApps > ceiling` catches them , and correctly: **those are the provider bleeding ADJACENT SEASONS into one query, not same-season transfers.** Do not loosen (A2) to make them sum.
  - **THE THREE CARDS LEFT IN PLACE FROM THE BSD BLOCK ARE PART OF THIS POPULATION, NOT A SEPARATE ITEM: Douglas Luiz 331 of 944, Ward-Prowse 415 of 1,109, Bobb 472 of 1,050.** They are three of the nine halved in PL 2025/26 alone. Their block copies are untouched and reversible, rt 41, 18 and 37.
  - **REPAIR IS rt-TOUCHING AT SCALE AND IS SCOPED BUT NOT RUN , see the plan in `INGESTION_RECOVERY.md`.** `--insert-only` CANNOT fix a halved row (ON CONFLICT DO NOTHING), and a default-mode re-run rewrites all ~57,000 rows rather than the ~1,600 that are wrong.
  - **AND RE-KEYING CANNOT REPAIR THEM, IT WOULD VIOLATE A CONSTRAINT: `player_season_cards` carries `UNIQUE (api_player_id, season, league_code)`** , one card per player per league-season. `resolveSeasonStat` SUMS a genuine same-league split into ONE card, **so the correct end state is a single summed card, not two rows.** Restored 2026-08-23: this fact was written on 2026-08-23 and then LOST when the entry above was rewritten the same day, and it survived only in `migrations/bsd_block_cleanup_2026-08-23/README.md`. **It is the reason the three cards were left in place rather than re-keyed.**

---

- **THE NINE REMAINING `card_id < 120000` ROWS WERE VERIFIED ONE BY ONE AGAINST THE PROVIDER ON 2026-08-29. NONE OF THEM DUPLICATES A CORRECTLY-KEYED CARD, SO NONE WAS DELETED. THE PREMISE THAT SOME ARE DISPOSABLE DUPLICATES IS WRONG.**
  - **SIX ARE SIMPLY CORRECT CARDS THAT HAPPEN TO CARRY A LOW `card_id`.** `J. Bijol` (api 833, Leeds), `N. Mazraoui` (545, Man Utd), `R. Gravenberch` (542, Liverpool), `Joelinton` (723, Newcastle), `M. de Ligt` (532, Man Utd), `J. Kluivert` (792, Bournemouth). **Verified against the provider on BOTH axes , `/players/profiles` returns the same person for every id, and `/players?season=2025` puts every one of them at the club we record.** Each is the ONLY card for its `api_player_id` in 2025/26. **They are not corrupt in any respect. Deleting them would destroy real, correctly-keyed data.**
  - **THREE ARE THE KNOWN BSD-KEYED TRANSFER HALVES, AND THEY ARE NOT DUPLICATES EITHER , THEY ARE THE MISSING HALF.** `Douglas Luiz` (card 108645, Aston Villa, 613m), `Oscar Bobb` (108799, Fulham, 579m), `James Ward-Prowse` (109011, Burnley, 694m). **The provider says those `api_player_id`s belong to OTHER PEOPLE , 4304 is Migert Taulla, 3651 is Rustem Hoxha, 4696 is Menaouar Benyettou** , which is the `source`-discriminator defect above, demonstrated live.
    - **BUT THE MINUTES RECONCILE EXACTLY WITH THE CORRECTLY-KEYED SIBLING, WHICH IS THE WHOLE POINT: 613 + 331 = 944 (Douglas Luiz), 579 + 472 = 1,051 (Bobb), 694 + 415 = 1,109 (Ward-Prowse)** , matching the totals already recorded in the same-league-transfer entry. The siblings are cards 130604 / 130484 / 130408 under the RIGHT api ids. **So each pair is two halves of one real season, not an original and a copy.**
    - **DELETING THEM LOSES 613, 579 AND 694 MINUTES THAT EXIST NOWHERE ELSE**, and the correct end state is the SUMMED single card the `UNIQUE (api_player_id, season, league_code)` constraint already implies , which is a REPAIR, not a deletion.
  - **THE METHOD NOTE THAT MATTERS: a low `card_id` is not evidence of corruption.** It was a useful heuristic for FINDING the block and it is worthless for JUDGING a row. Six of nine survivors are clean. **Judge on provider identity and on club, never on the id range that led you there.**

---

- **BSD IS RETIRED (2026-08-27). AND THE REASON IS NOT TIDINESS: `api/search-player.js` WAS A PUBLIC ENDPOINT THAT WROTE `onConflict:'api_player_id'` ON EVERY ONLINE LOOKUP, WHICH IS A LIVE CORRUPTION PATH AND IS ALMOST CERTAINLY THE ORIGIN OF THE PL 2025/26 BLOCK.**
  - **WHAT IT DID.** Production's `index.html` called it from `doLiveSearch()` and `gsearchLive()` , the "Searching online" fallback , and the endpoint then **upserted into `players` with `onConflict:'api_player_id'` and into `player_season_cards` with `onConflict:'api_player_id,season,league_code'`**. So a visitor typing a name that was not in the local set caused a WRITE, keyed on a column that does not record which provider issued the id. **That is exactly the mechanism §E already blames for the block: a numeric match treated as the same person.** The block was not a one-off migration accident; the door was open on every search.
  - **RETIRED, NOT PATCHED.** Deleted: `api/bsd-probe.js`, `api/debug-player.js`, `api/search-player.js`, `scripts/flesh-league.js`, and the four BSD-only workflows. Stripped: the `BSD_API_KEY` passthrough from `import-players.yml` (that workflow is API-Football and stays) and the credential plus signup links from `.env.example`. **Deployed functions: 16 -> 13.**
  - **WHAT DELIBERATELY REMAINS ARE RECORDS, NOT CREDENTIALS** , the post-mortem comment in `api/import-players.js`, this entry, `QA_PASS.md` A18, and `migrations/bsd_block_cleanup_2026-08-23/README.md`. **Deleting those loses the reason the corruption happened, which is the only thing that stops it being rebuilt.**
  - **THE KEY STILL NEEDS REVOKING AT THE PROVIDER AND REMOVING FROM VERCEL'S ENV.** Code no longer reads it; that is not the same as it being dead.
  - **THE STRUCTURAL FIX IS STILL OUTSTANDING.** `UNIQUE (source, api_player_id)` remains the real answer, because ANY second provider reintroduces this. Retiring BSD closes today's door, not the class.

---

---

- **125 CARDS CARRY A `position_pool` OF `UNK`, OUTSIDE THE EIGHT LOCKED BUCKETS, AND THIS IS THE GATING DEPENDENCY FOR FINISHING THE PERCENTILE REPARTITION (corrected 2026-08-21, was logged the same day as "two cards, do not chase").** The eight buckets are supposed to be CLOSED (§C position system: GK, FB, CB, CDM, CM, CAM, Winger, ST), so a ninth value means something wrote a pool the vocabulary does not define. **Spread: FWD 34, DEF 32, MID 32, GK 27, across ten seasons 1617 to 2526, rt 12 to 85, two at rt>=80.**
  - **THE WRONG NUMBER CAME FROM READING A SUBSET COUNT AS THE POPULATION.** The tag-distribution run printed `Engine Room  n=986  CM 613, CDM 237, (none) 134, UNK 2`, and the `2` was taken as the size of the problem. **It is the number of ENGINE ROOM HOLDERS carrying `UNK`** , one tag's pool breakdown, not a census. The real figure is **62x larger**. **A per-tag breakdown can only ever count the cards holding that tag; to size a data defect, query the column.**
  - **IT IS NO LONGER A DO-NOT-CHASE ITEM, BECAUSE THE REPARTITION RUNS THROUGH IT.** `rel_pct` is still partitioned on the coarse `psc.position` and is **half of a keeper's rt** (it is read ONLY in the `WHEN pos = 'GK'` branch). Repartitioning it onto `COALESCE(pool, pos)` sends **27 coarse-GK cards into a 125-card mixed `UNK` bucket**, where a keeper's minutes tower over the outfielders beside him. **Modelled: 41 GK cards move, NINE land exactly on the 75 cap , Buffon 1718 63 -> 75, Adler 1617 59 -> 75, Tyton 1617 51 -> 65.** That is the cap absorbing a wrong answer.
  - **CLEAN THE VOCABULARY FIRST AND THE SAME CHANGE IS HARMLESS: treating `UNK` as unverified and falling back to coarse leaves 14 GK cards moving by +/-1 and NONE capped.** **Non-GK cards move ZERO either way** , no outfielder's rt path reads `rel_pct`, `defvol_pct` or `duelq_pct`, and the band counts hold at 12 / 150 / 650 in both models (**the 80+ figure was recorded as 1,412 and measures 1,406 on 2026-08-29 , the three RANK-ANCHORED bands are 95/90/85 and only those hold by construction; 1,412 was a modelled number, not an anchor**). **Same ordering rule as the null-pool backfill: verify the pool before repartitioning on it, or you measure your own guess.**

---

- **`passes_accuracy` IS INVALID, NOT MERELY SPARSE, AND TWO LIVE TAGS GATE ON IT (found 2026-08-27).**  **, full evidence in the field menu in `POST_LAUNCH.md`** The provider itself reads **Kroos 92 in 2019, 67 in 2020, 67 in 2023** at Real Madrid on the same volume, and sustains **Modric 44-55, Kovacic 41-59, Pedri 42-47** , figures no elite midfielder produces. Whatever changed at the provider in 2020, the column no longer means one thing.
  - **IT IS ALSO ABSENT AT SOURCE, INTERMITTENTLY** , `"accuracy":null` while `total` and `key` populate and match our stored values. **THIS IS NOT THE GOALKEEPER SHAPE: those fields were arriving and being discarded by our merge; this one never arrives, so a re-run fills nothing.**
  - **LIVE EXPOSURE: Regista (635 holders) and Ball-Playing CB (208) gate on it** at `vv-core.js` 1184 and 1214, and their `passacc_p80` bars are computed over a mixed-unit population. Era rates diverge in OPPOSITE directions , Regista 1.72% -> 1.45%, Ball-Playing CB 0.26% -> 0.72%. **Not proven causal; not safe to assume otherwise.**
  - **DO NOT GATE ANYTHING NEW ON IT. `passes_key` is the corroborator that survives** , 100% covered every season and internally consistent.
- GOALS-PROVENANCE audit: some cards' `goals` include European-competition goals but the engine is domestic-only (confirmed Vanaken x5 + Mboyo, figures match all-comps totals); could inflate rt for Euro-competition clubs; audit vs a domestic-only source.
- DATA-FIX team_name: 181398 Aydin (Alanyaspor not Fenerbahce 23/24 , should then fall out of the big-club filter); 108547 Onyekuru (not Arsenal, HELD).
- NR-assist tail: 194 cards rt80-84, 1184 rt75-79 queued (tiered fill). `estimated_market_value` column is 100% empty (never populated). **Ibra 15/16 ordering wrinkle , DIAGNOSED AND NOT A DEFECT (2026-08-16): the tier map IS monotonic (0 violations over the 150 cards at rt>=90); Ibra 15/16 is at rt 93, not 94, and sits below six lower-output cards ENTIRELY because of the league tilt , Ligue 1 wt 0.717 costs him 12.58 b-units, and 100% of the 1,131 inverted pairs in that range have the weaker tilt on the lower-rt card. Nothing to fix; see §C**; rankings A-Z sort bug; card hero text overflow.

---

- **POSITION-POOL ACCURACY , OPEN (logged 2026-08-07, found during the search diagnosis; NOT a search bug, do not conflate).** **Nico Williams (api 183799) is a left winger recorded as `CAM` x4 (2021-2024) and `CM` (2025), never `Winger`.** Wrong at SOURCE and inherited: `psc.position` (API-Football coarse) reads FWD 2021-2024 then flips to **MID in 2025**, and `player_positions` stores CAM/CAM/CAM/CAM/CM. **The card renders `pp.position` faithfully , the display logic is correct, the stored value is wrong**, so this is a data fix, not a rendering fix. The 2025 `CM` is exactly the §C-documented systematic API-Football bug (attacking mids + wingers dumped into CM).
  - **THE BUCKET SYSTEM ITSELF IS NOT BROKEN , do not "fix" it wholesale.** Census: `Winger` holds 5,618 rows (12.9%), 500-640 per season since 2016, and Saka / Doku / Olise / Mbeumo / Yamal / Leão / Kvaratskhelia / Sané / Chiesa / Vinícius all carry Winger. Nico is an individual miss.
  - **TWO NEIGHBOURS WORTH THEIR OWN LOOK, both found in the same census:** (a) per-season assignments are NOISY , Rashford CAM/ST/Winger, Grealish CM/Winger/ST/CDM, and **Saka has a `CB` season**, which is plainly wrong; (b) **`CAM` collapses 457 (2021) -> 56 (2022)** and stays there, a discontinuity suggesting a reclassification pass changed CAM handling for 2022+ and left the eras inconsistent. Audit before trusting per-season buckets.
  - **VISIBLE CONSEQUENCE now that position is searchable:** `winger athletic` correctly returns Aduriz and Muniain but **cannot return Nico**, because the stored pool is wrong. Good demonstration of the cost.
  - Minor doc correction found en route: §C says "NO pre-2016 rows exist" in `player_positions`. There are a handful , 3 to 17 per season for 2010-2015. The practical point (pre-2016 needs INSERT, not UPDATE) still holds.

---

- **28 CARDS HAVE `penalties_scored` GREATER THAN `goals`, WHICH IS IMPOSSIBLE. THE GAW GUARD HIDES THE SYMPTOM, NOT THE CAUSE (logged 2026-08-21).** `LEAST(penalties_scored, goals)` in the live `gaw` caps the deduction so no card is docked for more penalties than it scored goals, and it neutralises all 28. **The rows are still wrong in the database.** Worst: Faivre 21/22 Lyon 3g/10p, Snodgrass 16/17 West Ham 0g/4p, Vlahovic 21/22 Juventus 7g/10p, Edwards 21/22 Sporting 3g/6p, Cerci 15/16 Genoa 4g/6p.
  - **A SYSTEMATIC TRANSFER MISALIGNMENT WAS SUSPECTED AND RULED OUT BY THREE TESTS.** The hypothesis was that goals are club-scoped while penalties are season-total, which would have made every mid-season transfer silently wrong rather than 28 loudly wrong. **(1) PER-90 BY MINUTES BAND: `goals/90` is flat at 0.140/0.145/0.146/0.146, while `pens/90` RISES with minutes, 0.008 to 0.017.** A season-total on a part-season row predicts the opposite, inflated penalties at LOW minutes. **(2) CROSS-LEAGUE TRANSFER PAIRS: of 77 two-card seasons carrying a penalty, 73 hold DIFFERENT counts per card**, only 2 are identical at 3 or more. Penalties are club-scoped, like goals. **(3) HIGH-MINUTES CONTROL: 195 cards with 5+ penalties and 2,500+ minutes contain ZERO impossibles.** A general misalignment would not spare full seasons.
  - **AND A METHOD WARNING FROM THE SAME INVESTIGATION: penalty SHARE by minutes band looked like proof and was an artefact.** Conditioning on "has at least one penalty" at low minutes forces a high share by construction, which read as 62.3% against 31.2% and looked exactly like the bug. **The absolute per-90 rate is what settled it. When a ratio implicates a subgroup, check the numerator on its own before believing it.**

---

- **KEEPER STAT FIELDS , THE 2026-09-05 SURVEY, RUN BEFORE ANYTHING WAS BUILT ON THEM.** Headline and decisions in `CLAUDE.md` §E. Read-only; nothing was written. Every figure measured against the live database, not quoted from a doc.
  - **COLUMN INVENTORY.** Read from `pg_attribute`, **not `information_schema`, which does not list matview columns at all** , the same blindness §C records for matview grants. All keeper fields are nullable `integer` on both relations. `player_card_mv` has 76 columns, `player_season_cards` 42.

        field              player_card_mv (57,055)     GK rows (4,289)
        saves                2,813  ( 4.9%)              2,806  (65.4%)
        goals_conceded      31,365  (55.0%)              2,816  (65.7%)
        penalties_saved      2,816  ( 4.9%)              2,816  (65.7%)
        starts              56,555  (99.1%)              4,243  (98.9%)
        fouls_drawn         37,673  (66.0%)              2,449  (57.1%)
        fouls_committed     36,832  (64.6%)              1,415  (33.0%)
        cards_yellow        57,055  (100.0%)             4,289  (100.0%)
        cards_red           57,055  (100.0%)             4,289  (100.0%)

  - **`cards_yellow` AND `cards_red` ARE ON THE MATVIEW BUT NOT ON `player_season_cards`.** They are sourced elsewhere in the view. **Anyone planning to WRITE discipline data must not assume the base table holds them.**
  - **DISTRIBUTIONS, GK rows.** `saves` n=2,806 min 0 med 65 max 176. `goals_conceded` n=2,816 min 0 med 30 max 102. `penalties_saved` n=2,816 min 0 med 0 max 6. `starts` n=4,243 min 2 med 24 max 45. **No negative value in any keeper field.**
  - **COVERAGE BY SEASON YEAR** (nothing before 2014): 2014:10, 2015:229, 2016:228, 2017:234, 2018:240, 2019:228, 2020:276, 2021:277, 2022:278, 2023:270, 2024:277, 2025:259.
  - **COVERAGE BY LEAGUE:** LL 360, TR 360, SA 352, PL 347, L1 323, PRT 313, ERE 300, BL 281, **BPL 170**.
  - **THE TEN ZERO-CONCEDED KEEPERS, IN FULL.** All carry `goals_conceded = 0` with `saves` NULL:

        A. Ramsdale     24/25 PL    2,700 min, 30 starts
        N. Marsman      15/16 ERE   2,009 min, 23 starts
        E. Özbir        20/21 TR    2,160 min, 24 starts
        A. Harush       19/20 ERE   1,440 min, 16 starts
        Iago Herrerín   16/17 LL    1,826 min, 21 starts
        J. Drommel      15/16 ERE   1,049 min, 11 starts
        F. Rønnow       20/21 BL      944 min, 10 starts
        C. Kameni       11/12 LL      768 min,  8 starts
        S. Johnstone    24/25 PL      630 min,  7 starts
        A. Haghighi     15/16 PRT     320 min,  3 starts

    **16 GK cards carry `goals_conceded = 0` in total. The other 6 have `saves > 0` on low minutes and are plausible.**
  - **THE `starts` DIAGNOSIS, AND WHY IT NAMES `starts` RATHER THAN `appearances`.** 774 of 56,555 comparable cards have `starts > appearances` (DEF 294, MID 253, FWD 183, GK 44). Worst: El Ouahdi 23/24 BPL 40 starts / 5 apps / 430 min; Audero 25/26 SA 38 / 4 / 360; Ramaj 25/26 BL 35 / 4 / 360; Agirrezabala 25/26 LL 23 / 5 / 450. **Minutes is consistent with APPEARANCES on 400 of the 774 and with STARTS on only 78**, so `starts` is the corrupt field. Audero's 360 minutes is exactly 4 x 90.
  - **`penalties_saved` DISTRIBUTION:** {0:1599, 1:818, 2:282, 3:87, 4:26, 5:3, 6:1}, mean 0.628. **Zero non-GK cards carry it**, so unlike `saves` it is genuinely keeper-only.
  - **SEVEN NON-KEEPERS CARRY `saves`** , Ocampos LL 19/20, Fares SA 17/18, De Smet L1 23/24, Amadou L1 17/18, Fontán ERE 22/23, Safouri TR 23/24, Demirbağ TR 22/23. All 1 or 2 saves with 0 conceded, across five leagues and five seasons. **This is the plausible shape of an outfielder finishing a match in goal after a keeper is sent off** , explicable, not corrupt, but it means `saves IS NOT NULL` is not a keeper filter on its own.
  - **THE AGREEMENT TEST THAT WAS UNDISCRIMINATING, AND IT NEARLY SHIPPED AS A FINDING.** Asked whether outfield `goals_conceded` was the TEAM total, the test "do all outfielders on one team-season share a value" returned **1,589 of 1,589 in perfect agreement**. That reads as overwhelming support. **It was wrong** , they agree because the value is a constant zero. **Min and max settled it in one query.** Promoted to a rule in §C, beside the existing consistency-cannot-be-the-test rule it sharpens.

## THE WORLD CUP CAREER LEG IS RETIRED IN JS AND STILL COMPUTED IN SQL (2026-09-12, LATENT)

**`29abbe9` retired the career leg on the front end** , `world_cup_winner` now matches its own
season like every other honour, and the "held as of here" half moved to the Cabinet, which is
as-of the card's own season. **`player_card_view` did not change.** Read from a fresh
`pg_get_viewdef` on 2026-09-12, the world_cup CTE still joins
`ON h.api_player_id = p3.api_player_id AND psc3.season_year >= h.season_year`, so it still
emits one row per season from the tournament onward and those still land in `honours_json` with
`leg`.

**NOTHING READS IT, WHICH IS WHY THIS IS LATENT AND NOT LIVE.** The card builds its honours
from the `honours` table via `fetchHonours`, not from `honours_json`. The seven `h_*` booleans
are display flags for the filter rail and are LEFT JOINed at the end of the view , verified the
same day that no rt expression references honours at all, so none of this touches a score.

**THE TRAP IS FOR THE NEXT CONSUMER.** Anything that starts reading `honours_json` , a payload
field, a tag, a share surface, a rankings column , inherits the leg and with it **333 phantom
World Cups**: the leg attaches in BOTH directions, so a 2010 card of a 2014 winner carries one.
Measured 2026-09-11: 496 pairs after the tournament, 91 on it, 333 before it.

**FIX IT IN THE VIEW BEFORE READING THE COLUMN, NOT AFTER.** The change is `>=` to `=` in that
one join, and it is rt-safe by the paragraph above, but it rides a view edit and therefore the
capture-before-edit rule in §C.

## THE VERDICT AND NOTES CACHES STORE RAW ** MARKERS, BY DESIGN (2026-09-12, LATENT)

**Same shape as the entry above, and meant to be read beside it: a column that is correct for
its current reader and a trap for the next one.**

Since the emphasis work the model marks two to three phrases a paragraph with `**double
asterisks**`, and **`verdict_cache.verdict` and `notes_cache.notes` store that text verbatim.**
Six display surfaces convert it , compare's `.vquote`, `.vsprose` and `.vwho`, the card's
`#glDrury`, `#scoutBody` and `#notesBody` , through `VVCore.vvEmphasis`, which escapes first
and then promotes only `**...**` into `<strong>`.

**WHY IT IS NOT STRIPPED AT WRITE TIME, which is the obvious fix and the wrong one.** The
markers ARE the emphasis. Strip them on the way into the cache and every surface that wants
emphasis loses it permanently, recoverable only by regenerating every row at cost. The markers
are signal in storage and noise at a sink, so the stripping belongs at the sink, where the
reader knows which it is.

**THE RULE, GREPPABLE ON PURPOSE: prose reaches a sink through `VVCore.vvStripMarkers`, never
raw.** Two sinks exist today: the share frame's verdict line , `shEsc` escapes `&`, `<`, `>`
and `"` and does NOT touch an asterisk, so an unstripped string prints two literal asterisks
into the poster , and the score-strip regex in compare's `vvSetVerdict`.

**THE TRAP FOR THE NEXT CONSUMER.** Anything that starts reading either cache outside those six
surfaces , an og:description, a title, an alt attribute, an export, a digest mail, a rankings
column , inherits the markers and renders them. **`textContent` does NOT strip them, it renders
them.** The share poster passes today only because it reads `textContent` from a node
`vvEmphasis` has ALREADY converted, which is a property of the call order rather than of the
data, and one refactor away from breaking silently.


---

## `COALESCE(assists, 0)` INSIDE `gaw` IS "NR FOR MISSING DATA, NEVER 0" INVERTED, IN THE ENGINE (found 2026-09-12, LOGGED NOT FIXED)

**[FIGURES CORRECTED 2026-09-12, BOTH UNDERSTATED. THE ORIGINAL READ "OVER A FIVE-YEAR WINDOW"
AND "18,322 CARDS", AND EACH IS WRONG IN THE DIRECTION THAT MAKES THIS LOOK SMALLER THAN IT IS.]**

**THIS IS A LIVE SCORING DEFECT ACROSS A FOURTEEN-YEAR TAIL, NOT A FIVE-YEAR WINDOW.** From the live
`player_card_view`, read from a fresh `pg_get_viewdef`:

    gaw   = goals - 0.22 * LEAST(COALESCE(penalties_scored,0), goals) + 0.7 * COALESCE(assists, 0)
    gaw90 = gaw / NULLIF(minutes / 90.0, 0)

**`gaw90` is the engine's output term.** So a card whose assists are UNRECORDED is scored exactly
as though it recorded ZERO assists, and the 0.7 weight means the difference is not marginal.

**THE POPULATION, AND THE ENGINE-RELEVANT FIGURE IS THE BIGGER ONE.** Two counts exist and they
answer different questions, so both are recorded rather than one replacing the other:
- **2010-2015, ALL cards: 20,219, of which 18,322 carry a null assist total.** That is the figure
  this entry first carried. It counts cards the engine never scores.
- **SCORED OUTFIELD CARDS ARE WHAT THE ENGINE ACTUALLY RATES** (`minutes >= 300 AND goals IS NOT
  NULL`, non-GK), and **26,776 of those 50,269 carry a null assist total , 53.3%.** Inside the
  2010-2015 window the comparable figure is 16,731. **Quote 26,776: over half of every card the
  platform scores is scored on an assumed zero.**

**IT IS AN ERA STEP TERMINATING IN 2015, WITH A LONG TAIL AFTER IT , NOT A WINDOW THAT CLOSES.**
Null-assist scored outfield cards by season: **2010 2,977 | 2011 3,032 | 2012 3,032 | 2013 3,049 |
2014 3,089 | 2015 1,552 | 2016 1,454 | 2017 1,471 | 2018 1,420 | 2019 1,455 | 2020 1,340 |
2021 1,293 | 2022 1,074 | 2023 535 | 2024 3 | 2025 0.** **11,597 of the 26,776 sit in 2015 or
later**, so any remedy scoped to "pre-2015" misses 43% of the affected cards.

**THE STEP IS VISIBLE IN THE PUBLISHED SCALE.** Median rt by season runs **41, 41, 41, 40, 41 for
2010-2014 and then 47, 52, 55, 57, 55 from 2015** , a 15-point step on a ladder whose bands are 5
points wide. Cards at rt>=80 roughly double, about 50 a year before and 100 to 130 after.

**AND A CONTROL RULES OUT FOOTBALL AS THE CAUSE. THIS IS THE PART THAT MAKES IT A DEFECT RATHER
THAN AN OBSERVATION.**
- **Median goals per 90 is FLAT across the boundary:** 0.0700 / 0.0690 / 0.0680 / 0.0683 / 0.0662
  for 2010-2014, against 0.0723 / 0.0718 / 0.0721 / 0.0786 / 0.0751 for 2015-2019.
- **Median MINUTES is flat too** , about 1,530 before and 1,510 after. (Minutes is what was
  measured here; `starts` is unreliable on 774 cards and is not the control to use, see the keeper
  entry.)
- **THE CLINCHER: for 2010-2014 median `gaw90` EQUALS median goals90 to four decimal places**
  , 0.0700 against 0.0700 in 2010, and the same identity holds every year to 2014. **The assist
  term contributes literally nothing for five seasons.** The doubling of median `gaw90` at 2015
  (0.066-0.070 to 0.121-0.137) is that term switching on, with goals and minutes unmoved.

**IT IS POSITION-SHAPED, NOT UNIFORM, SO IT DISCRIMINATES BY ROLE.** Simulated median gain if the
absent totals were supplied: **CAM +7, Winger +5, ST +3**, with **FB reaching p90 +12 and a maximum
of +20**. Centre-backs barely move, because the donor median for CB assists per 90 is 0.000. **The
cards punished hardest are the ones whose output IS assists**, which is the defect at its most
pointed: a creator with no recorded assists is scored as a forward who did nothing.

**THE ORIGINAL 2010-2015 FIELD CENSUS, KEPT (20,219 cards):**

    assists            18,322 null   90.6%
    tackles_total      17,486        86.5%     shots_on          17,051   84.3%
    shots_total        17,021        84.2%     passes_key        17,015   84.2%
    dribbles_success   17,019        84.2%     dribbles_attempts 17,013   84.1%
    interceptions      17,002        84.1%     passes_total      16,974   84.0%
    duels_won          16,982        84.0%     duels_total       16,978   84.0%
    penalties_scored   16,964        83.9%
    appearances 0%   minutes 0%   goals 0.4%

**18,322 cards are being scored on an assumed zero.**

**THE PRECEDENT IS THIS FILE'S OWN, TWICE, AND IT POINTS THE SAME WAY BOTH TIMES.**
- **`goals_conceded` zero-filled on 28,549 outfield cards** is recorded in SS E as *"a
  NOT-APPLICABLE sentinel written as data, which is exactly what NR for missing data, never 0
  forbids"* , min 0, median 0, max 0, not one outfield row above zero.
- **The `sig` null policy** (SS C) records the opposite error and rejects it on measurement:
  nulling `sig` so the floor falls to zero moved 306 of 329 cards, median 27.07 points of `b`,
  maximum 44.41, and is described as punishing *"327 cards for a missing field, which is this
  file's own first principle inverted"*.

**AND THE SHARPEST EVIDENCE IS INTERNAL: THE TAG ENGINE ALREADY REFUSES TO DO THIS, ON THIS EXACT
FIELD, TWELVE LINES OF COMMENT DEEP.** `rawFloorOK` in `vv-core.js` carries the house rule in its
own words , *"NR IS NOT ZERO (house rule). A MISSING raw stat is EXEMPT from a raw floor rather
than failing it , 54.2% of rows have null assists (the pre-2015 FBref gap), and treating those as 0
would silently punish a data gap as if it were a bad season."* It even records the cost of getting
it wrong: a 2026-08-14 change that rejected nulls **dropped 28 Playmaker holders purely for
unrecorded assists** and was reverted the same pass.
**SO THE PLATFORM HAS ALREADY RULED ON THIS FIELD AND THE SCORING ENGINE DOES THE OPPOSITE OF WHAT
THE TAG ENGINE DOES.** The tag engine exempts a null assist; `gaw` adds a hard zero. **That is not
two defensible choices, it is one rule applied in one place and not the other** , the same
two-implementations-of-one-decision shape SS C records against `eligibility()` and the view's two
position keys. It is also independent corroboration of the population: 54.2% measured there
against 53.3% measured here, on different filters.

**SO BOTH DIRECTIONS ARE ALREADY RULED ON. Substituting a value for an absence is the defect;
which value you substitute only changes who it hurts.** The `sig` case at least RENORMALISED onto
the facet it still had. `gaw` does not: it adds a hard zero.

**WHICH FIELDS ARE ACTUALLY IN PLAY, BECAUSE THE PARAGRAPH BELOW SAYS "AN ENGINE CHANGE" WITHOUT
NAMING THEM, AND THE OBVIOUS ANSWER, "ASSISTS", IS WRONG (measured 2026-09-12, read from the view).**
Of the twelve fields that sit at 84 to 90% null in this window, **TWO feed rt here, three more feed
it on a different window, and eight feed no scoring expression at all.**

**1. `penalties_scored` IS THE SECOND SCORING FIELD AND IT MOVES CARDS THE OTHER WAY.** It is in
`gaw` alongside assists, and it is 83.9% null in this window:

    gaw = goals - 0.22 * LEAST(COALESCE(penalties_scored,0), goals) + 0.7 * COALESCE(assists,0)

With the field null the `COALESCE` makes the discount **zero, so the penalty deduction is never
applied** and a pre-2015 penalty taker is currently scored as though every goal were from open
play. **Filling it moves those cards DOWN.** That is the same NR-as-zero defect as the assists half,
pointing the opposite way, and **it does not offset it**: both terms are read through `pos_pct` and
`posvol_pct`, which are percentiles WITHIN POOL, so a filled card takes its assist lift and its
penalty discount against a pool where neither has been applied. **Two artefacts, not one, and they
cannot cancel, because the lift is broad and the discount lands only on designated takers.**

**2. WARNING, AND WRITE IT THIS WAY ROUND SO THE SENTENCE THAT OUTLIVES THIS WINDOW IS THE CORRECT
ONE: only assists and penalties feed rt HERE. The three defensive fields are held out by a
`season_year >= 2016` GATE, NOT BY THEIR NATURE, and on any window from 2016 they feed
`def_share_pct` into `sig` and the FLOOR, which dominates everything else.**
`tackles_total`, `interceptions` and `tackles_blocks` build `def90`, with **`tackles_total` as the
gate**: `CASE WHEN tackles_total IS NOT NULL THEN (COALESCE(tackles_total,0) +
COALESCE(interceptions,0) + COALESCE(tackles_blocks,0)) / (minutes/90) ELSE NULL END`. `def90`
becomes `def_share`, whose within-pool percentile is `sig`, which sets `FLOOR = min(64, 44 + 22*sig)`
for CB, FB and CDM. **That is a floor of 44 to 64, so switching it on is a far larger move than
anything assists does.** SS C measured the identical mechanism in REVERSE, nulling `sig` so the
floor falls to 0: **306 of 329 cards moved, median 27.07 points of `b`, maximum 44.41.**
- **WHY IT CANNOT FIRE ON 2010-2015:** the view's pool CTE carries `AND r.season_year >= 2016 AND
  pp_1."position" IS NOT NULL`, so a pre-2015 card is excluded from the `def_share` percentile pool
  twice over and its floor is 0 whatever is filled. Confirmed independently in
  `scripts/separability/rt_reimpl.js`, which carries the same `season_year < 2016` exclusion and
  validates at 99.56% against stored rt.
- **SO "CCC DOES NOT TOUCH rt" IS TRUE OF THIS WINDOW AND FALSE OF THE PLATFORM.** Anyone proposing
  a fill from 2016 onward is in a different regime where the defensive floor is the dominant term.

**3. AND THE EIGHT NON-SCORING FIELDS REACH A SECOND POOL-RELATIVE SURFACE, SO THEY ARE NOT FREE
EITHER.** `shots_on`, `shots_total`, `passes_key`, `dribbles_success`, `dribbles_attempts`,
`passes_total`, `duels_won` and `duels_total` feed no scoring expression (`duels_won`/`duels_total`
did until `sig = def_share_pct` landed on 2026-09-08). **The Proof panel is genuinely safe, because
it prints per-90 rates and a denominator, which are absolute numbers with no pool in them.** But
`passes_key`, `dribbles_success` and `passes_total` are **live radar inputs, scored against
`RADAR_POOL_REF`, an embedded snapshot**. A partial fill hands those cards axes measured against a
snapshot built while they were NR, and **regenerating the snapshot to correct that re-percentiles
every card on the platform.** So the partial-fill pathology recorded below is not confined to rt; it
reaches the radar by the same route.

**FIXING IT IS AN ENGINE CHANGE AND NEEDS THE FULL PROCEDURE, NOT AN EDIT.** Any change here moves
`gaw`, therefore `gaw90`, therefore the pool percentiles, therefore **cards nobody touched** , the
same ripple the position batch measured. It needs a simulation against a full `before.json`
snapshot, a predicted mover and band-crossing count, and a post-refresh diff against that
prediction, exactly as `migrations/positions_2526_2026-09-11/` did.

**[DECIDED 2026-09-12, LUCAS: ACCEPT AND DISCLOSE. THE PARAGRAPH BELOW RECORDED IT AS OPEN AND IT
IS NOT, BUT ITS WARNING STILL STANDS.]** The options are not symmetric and the choice was a product
decision about what an unrecorded assist MEANS, not a code decision. **Do not "tidy" this into a
null-safe expression on the way past , it would re-rate half the scored population silently.**

**THE DECISION: ACCEPT THE SCORES AS THEY STAND AND DISCLOSE THE ERA STEP. NO ENGINE CHANGE.**
- **"ACCEPT" IS THE STATUS QUO, SO THERE IS NOTHING TO BUILD IN THE ENGINE AND NO MIGRATION.** The
  `gaw` expression stays exactly as it is. **The entire deliverable is the DISCLOSURE**, and if the
  disclosure does not ship then the decision has not been implemented , the same shape as the
  null-pool policy, which SS C says is "option A with extra steps" without its disclosure half.
- **PLACEMENT FOLLOWS THE CONFIDENCE-DOT PRECEDENT** , the platform already tells a reader which
  cards rest on thin data, and this is the same claim about the same cards.

**THE THREE TREATMENTS WERE SIMULATED BEFORE DECIDING, FULL ENGINE RE-RUN EACH TIME SO THE RIPPLE
ONTO UNTOUCHED CARDS IS COUNTED, NOT ASSUMED.** Run on the checked-in transcription in
`scripts/separability/rt_reimpl.js` (99.56% exact), with BOTH sides using the reimplementation so
its transcription error cancels rather than reporting as movement:

    treatment              cards moved   band crossings   of which UNTOUCHED
    impute, flat              27,640           304               127
    impute, rank-matched      29,199           908               393
    exclude (honest NR)       15,999           513               513

- **EXCLUDE IS NOT VIABLE AND IS NOW MEASURED RATHER THAN ARGUED: it costs 26,776 cards their score
  entirely**, including every card from 2010 to 2014, and still moves 513 survivors across bands.
- **NEITHER IMPUTATION IS A FIX , THEY ARE THE DEFECT RESTATED WITH A DIFFERENT VALUE.** They were
  run to SIZE the distortion, and they bracket the cost of any future repair that hands these cards
  a plausible assist total: **304 to 908 band crossings, 127 to 393 of them on cards nobody
  touched.** Named casualties are all modern and all untouched , **Salah 2025 falls 80 to 79, 78 or
  75 depending on treatment; Bowen 2025 85 to 83; Kluivert 2024 85 to 84.**
- **SO THE RIPPLE IS THE REAL ARGUMENT FOR ACCEPTING.** Repairing the old cards re-percentiles the
  pool and demotes current ones, which is a visible, arguable change to live cards in exchange for
  a number nobody can verify.

**THE METHOD ERROR IN THAT SIMULATION IS RECORDED BECAUSE A WRONG HEADLINE WAS ONE RUN AWAY.** The
first pass keyed the imputation donor on `position_pool`. For the pre-2016 era that field is null
and falls back to the coarse DEF / MID / FWD, so the donor drew **n = 2, 7 and 8** cards from
2024-25 and imputed roughly ZERO , **under-imputing precisely the 16,658 cards the defect is worst
in, and reporting the era as barely affected.** The figures above are from the corrected run, with
the coarse buckets mapped onto real donors. **GENERALISE IT: when a donor or a control is keyed on
a field, check that field is POPULATED in the era you are pointing it at.** Same family as SS C's
rule that a rule stated in one place and not applied as a class will be violated everywhere else.

**AND THE DONOR CHOICE ITSELF IS A CONSTRAINT WORTH KEEPING: only 2024 and 2025 have assists at
~100% coverage.** 2015-2021 is 38 to 47% null, so it is a SELECTED subset , the cards that HAVE a
recorded assist total in those years are not a random sample of them , and it cannot be a donor.
Anyone re-running this must draw from 2024-25 or state why not.

### [DECIDED 2026-09-12: A PARTIAL ASSISTS BACKFILL IS DROPPED, BOTH VARIANTS. IT IS WORSE THAN DOING NOTHING AND WORSE PER CARD THAN DOING EVERYTHING.]

**THE FINDING THAT DECIDES IT, AND IT IS ONE NUMBER: THE SAME IMPUTED ASSIST TOTAL PRODUCES A
MEDIAN rt GAIN OF 0 UNDER A FULL FILL AND +7 UNDER THE 50-PLAYER VARIANT.** Identical donor,
identical value, identical card. **So the gain is not the repair arriving, it is the artefact of
leaving the card's POOL pinned at a hard zero while the card rises out of it.** rt is percentile
scored within pool, so filling a subset does not correct those cards, it re-ranks them against
neighbours who keep the defect. A number that moves because of who was NOT fixed is not a
measurement of the player.

**AND THE DIRECTION IS ABSOLUTE: ZERO CARDS MOVE UP, IN ANY VARIANT, INCLUDING THE FULL FILL.**
Every card not in the filled set moves DOWN or stays still , 15,056 of them on a full fill, 13,434
on the top-10-clubs variant, 1,474 on the 50-player variant. A partial fill does not merely fail to
help the rest of the pool, it demotes it.

**MEASURED WITH A FULL-FILL CONTROL ON THE SAME INSTRUMENT**, so the comparison is like for like
rather than two harnesses, using `scripts/separability/rt_reimpl.js` with the rank-matched donor and
the corrected coarse-bucket mapping:

    variant                     filled   their median gain   others moved   crossings   on UNTOUCHED   per 1,000 filled
    full fill (control)         26,776           0             15,056          908           393            14.7
    A, top 10 clubs 2010-2015    6,029          +5             13,434          586           272            45.1
    B, top 50 players            255            +7              1,474           55            31           121.6

**THE PER-UNIT COST IS THE NUMBER TO QUOTE, BECAUSE IT IS THE ONE THAT STOPS THIS BEING PROPOSED
AGAIN. Per card actually repaired, variant B causes 8.3x more untouched band crossings than a full
fill, and variant A 3.1x.** The intuition that a smaller write is a safer write is exactly inverted
here: the smaller the slice, the more of its pool is left holding the zero it is being measured
against, so the more distortion each repaired card buys.

**POOL SHARE IS THE MECHANISM.** Variant A covers 32.4% of DEF, 33.5% of MID and 31.0% of FWD, so a
third of each coarse pool moves while two thirds hold a hard zero. Variant B covers 2.1% of MID and
2.4% of FWD. **Neither is small enough to be harmless and neither is large enough to move the pool
with the card.**

**THE CASUALTIES ARE CURRENT CARDS NOBODY TOUCHED, WHICH IS WHAT MAKES IT INDEFENSIBLE.** Variant B
spends **31 untouched band demotions to fill 255 cards**: Salah 2025 falls 80 to 79, Kluivert 2024
85 to 84, Raphinha 2021 and R. Jimenez 2024 both out of Standout. **A 2010-2014 data repair that
demotes a live 2025 card is paying with the wrong currency.**

**SO THE ONLY TWO COHERENT POSITIONS REMAIN THE ONES ALREADY RULED ON ABOVE: fill everything, or
fill nothing and disclose.** "Just the big clubs" and "just the famous players" are not cheaper
versions of the repair, they are a different and worse operation. **Do not re-propose a subset
without re-reading this table.**

**AND NOTE WHY IT SURVIVED: every internal check passes it.** The column is populated for 2015+,
the expression is valid SQL, no row errors, and the scores look plausible. It is only visible if
you ask what the COALESCE is standing in for , which is the same shape as the `goals_conceded`
sentinel that sat unnoticed until someone read min and max.


---

## `goals` IS NULL ON UP TO 21.4% OF A SEASON'S OUTFIELD CARDS IN 2022-2024, SO THOSE CARDS ARE NEVER SCORED (found 2026-09-12, LOGGED NOT CHASED)

**FOUND WHILE MEASURING SOMETHING ELSE, AND THE ROUTE IN IS WORTH KEEPING BECAUSE THE SYMPTOM
LOOKED LIKE FOOTBALL.** Median goals per 90 on scored outfield cards rose **57% from 0.0767 in 2021
to 0.1210 in 2024** while median minutes stayed flat (1,509 to 1,569). A scoring boom is the
plausible reading and it is wrong.

**THE SHARE OF SCORED CARDS WITH ZERO GOALS IS WHAT GAVE IT AWAY: 32.8% in 2021, 23.7% in 2022,
25.6% in 2023, 16.1% in 2024, and then 33.5% in 2025.** A real trend does not snap back in one
season. **The low-output tail is missing from 2022-2024 and present either side of it.**

**THE CAUSE, MEASURED: `goals IS NULL` ON CARDS THAT OTHERWISE LOOK NORMAL.**

    season   outfield cards   goals NULL     %      median minutes of the NULL cards
    2019          3,292            132      4.0%              948
    2020          3,524            156      4.4%            1,165
    2021          3,528            158      4.5%            1,191
    2022          3,492            527     15.1%            1,044
    2023          3,447            410     11.9%            1,148
    2024          3,420            732     21.4%            1,082
    2025          3,451             14      0.4%              360

**THE TOTAL CARD COUNT IS FLAT THROUGHOUT (3,420 to 3,528), SO NOBODY IS MISSING FROM THE TABLE.**
What changed is that a growing share of them carry no goal total. **`player_card_view`'s `scored`
CTE requires `goals IS NOT NULL`, so every one of those cards is excluded from the engine and
carries a NULL rt** , 732 cards in 2024 alone. They are then absent from the percentile pools, and
the survivors are the ones who scored, which is exactly the 57% median rise.

**THESE ARE NOT FRINGE PLAYERS, WHICH IS WHAT MAKES IT COSTLY.** The NULL-goal cards carry a median
of **1,044 to 1,191 minutes** , regular starters, twelve or thirteen full matches. **The platform
is silently not rating roughly a fifth of the 2024 outfield population**, and because a missing rt
renders as absence rather than as an error, nothing on any surface says so.

**THIS IS ALSO PART OF AN ALREADY-RECORDED NUMBER WHOSE SHAPE NOBODY HAD LOOKED AT.** SS C records
"3,061 of 57,234 cards have a null rt" as a flat fact behind the `nullsFirst:false` rule. **It is
not flat: 2,129 of those sit in 2019-2025 and they are concentrated in 2022-2024.** A total with no
year breakdown hid a threefold discontinuity.

**WHAT WOULD TEST IT, AND THE FIRST TEST IS EXTERNAL BY NECESSITY.** The question is whether `goals`
is absent AT SOURCE for these cards or arriving and being discarded by our merge. **That is exactly
the goalkeeper-fields shape** , SS D records those as "arriving in the API response and being
discarded by one line in the importer's merge" , and it is the difference between a re-run that
fixes it and a re-run that fills nothing.
1. **Pull two or three of the 732 from the provider** (`/players?id=&season=2024`) and read whether
   `goals.total` is present. SS C: only the external source settles this; no internal check can.
2. **If it IS present, this is an importer defect and a re-run repairs it** , but note SS C's rule
   that any re-ingest must be INSERT-ONLY, and that these rows already exist, so the repair is an
   UPDATE of a single field and needs its own plan, not `--insert-only`.
3. **Either way it is rt-touching at scale.** Restoring 732 cards to `scored` in 2024 adds them to
   every percentile pool they belong to, so it moves cards nobody touched. **It needs the same
   before/after simulation as the COALESCE entry above**, and the two should be considered together
   because both change who is IN the scored population.

**NOT CHASED, BY INSTRUCTION, 2026-09-12.** Recorded with its numbers so the next session starts
from the mechanism rather than from the 57% rise, which points at football and is a dead end.

---

## `top_assists` WAS COMPUTED FROM OUR OWN 99%-NULL ASSISTS COLUMN, SO THE "LEAGUE LEADER" WAS THE MAX OF A HANDFUL OF ROWS (found and CORRECTED 2026-09-12)

**REPORTED BY LUCAS FROM ONE CARD AND IT WAS REAL: Van Persie's 2011/12 card carried Top Assists on
9 assists.** The actual Premier League leader that season had more. **Ten rows were deleted; the
writer is fixed; no external sourcing was done.**

**THE MECHANISM.** `scripts/enrichment/honours/compute_top_assists.js` ranked on **our own `assists`
column** and treated a null as a zero-assist season:

    o.a += (r.assists == null ? 0 : r.assists);

**PL 2011/12 holds 390 cards and 387 of them are null on assists, 99.2%.** The entire populated set
was Van Persie 9, Aguero 8, Yakubu 2. **The league assists leader was selected as the maximum of
three values.** This is the same NR-as-zero inversion the engine's `COALESCE(assists,0)` commits,
arriving by a different route, and SS B's house rule names it: NR for missing data, never 0.

**THE VALUE-9 SIGNATURE, AND IT IS THE PART WORTH REMEMBERING.** A genuine top-five-league assists
leader lands between roughly 12 and 20. **Four of the ten bad rows stored exactly 9** , Van Persie
twice, Giroud, Nene , because 9 is what the sparse maximum happens to be. **A suspiciously LOW
winning value is the tell for this defect class**, not a high one.

**THE GUARD EXISTED AND MISSED BY ONE.** The script already flagged suspect league-seasons:

    === COVERAGE GAPS: league-seasons where max assists < 9 (suspect) ===
    if (t && t.val < 9) { ... }

**The threshold was `< 9` and Van Persie's value was exactly 9, so the worst row on the platform
passed the guard by a single assist** and was never printed. **The lesson is not to lower the
threshold** , that is the same guess one notch down. **A guard on the VALUE is guessing at the
symptom; the gate belongs on COVERAGE, which is the actual cause.**

**THE GOLDEN_BOOT CONTROL CONFIRMS THE MECHANISM RATHER THAN LEAVING IT INFERRED.** Same script,
same shape, different column: **`goals` is 0.4% null in the same window.** Measured 2026-09-12:
**13 of 120 `top_assists` rows sat in a league-season that is majority-null on assists, against 0
of 143 `golden_boot` rows on goals.** Where the underlying column is populated the computed winner
is sound.

**AND THE STRUCTURAL FACT BEHIND ALL OF IT: `top_assists` IS THE ONLY HONOUR TYPE COMPUTED FROM OUR
OWN DATA.** Every other type is externally sourced:

    top_assists       computed        120        <- the only one
    golden_boot       wikipedia_ccc   141   + computed 2 (the live TR 2025/26 tie)
    league_champion   wikipedia_ccc   143
    player_of_season  wikipedia_ccc   102
    world_cup_winner  wikipedia_ccc    93
    ucl_winner        wikipedia_ccc    16
    ballon_dor        wikipedia_ccc    14

**So the platform asserts six honours on external authority and derived the seventh from a column
it knows to be 99% empty.** Nothing flagged the inconsistency because the row looked identical in
the table once written.

**THE TEN ROWS DELETED, ALL `source='computed'`, ALL PRE-2015, NAMED SO THEY CAN BE RE-CHECKED:**

    id 324  2013 LL  L. Messi          11a      id 337  2012 PL  Robin van Persie   9a
    id 325  2010 LL  L. Messi          18a      id 339  2011 PL  Robin van Persie   9a
    id 327  2014 LL  L. Messi          18a      id 342  2013 PL  L. Suarez         12a
    id 329  2011 LL  L. Messi          16a      id 376  2011 L1  O. Giroud          9a
    id 330  2012 LL  L. Messi          12a      id 386  2010 L1  Nene               9a

**honours 631 -> 621.** Full rows captured to `migrations/top_assists_sparse_2026-09-12/before_rows.json`
before the delete. **The Messi rows were probably right BY LUCK** , he genuinely led those La Liga
seasons and is one of the few players whose assists are populated , but a row that is correct by
accident is not evidence, and the value cannot be trusted either (16 where the real figure was 15).

**IT HAD TO BE AN EXPLICIT DELETE, NOT AN UPSERT, AND THE INDEX IS THE REASON:**

    CREATE UNIQUE INDEX honours_one_per_award ON public.honours
      USING btree (honour_type, season_year, league_code, api_player_id) NULLS NOT DISTINCT

**`api_player_id` IS PART OF THE KEY**, so uniqueness is per award-season-league-PLAYER, not per
award-season-league. **An upsert of a corrected winner carries a different `api_player_id`, so it
INSERTS A SECOND ROW and leaves the wrong one standing**, giving that league-season two Top Assists
holders, two sets of pills and two cabinet entries. **Any future correction pass must DELETE
first.** The index is not wrong , it correctly permits genuine ties , and must not be changed.

**THE BLAST RADIUS, MEASURED, BECAUSE IT IS LARGER THAN THE ROW COUNT.** An honour row reaches the
card face (`renderTopHonourPill`), the glance (`renderHonourChips`), the Wonder Tags rows, the
rankings pills and filter rail (via the matview's `h_top_assists` flag), the Compare verdict prompt
(`compare.html` writes `HONOURS: ...` into the payload, so the model was told he led the league),
and the share poster. **And THE CABINET MULTIPLIES IT: the cabinet shows everything won up to that
point, so a wrong 2011 honour appears on every later card that player holds. Ten rows, ten own
cards, 96 CABINET APPEARANCES.** Messi alone accounted for 55.

**THE FIX TO THE WRITER, AND THE BAR SITS IN A MEASURED EMPTY GAP RATHER THAN BEING TUNED.**
Nulls are now EXCLUDED rather than zeroed (a player enters the ranking only if at least one of his
rows for that league-season carries a real figure), and the value guard is replaced by a COVERAGE
gate, `MIN_COVERAGE = 0.25`. **Coverage share across all 120 written rows splits cleanly:**

    10 rows at 0.5% to 1.9%     <- every one an artefact, and exactly the ten deleted
     0 rows between 1.9% and 45.0%
    13 rows at 45% to 52%, the bulk at 50-70%, and 21 rows above 90%

**A healthy league-season is only about 50 to 70% populated**, because the importer's 300-minute
floor keeps the tail out, so a high bar would refuse legitimate seasons. **0.25 is the midpoint of
an empty region: any bar from roughly 0.05 to 0.44 refuses exactly the same ten rows, which is what
makes it robust rather than tuned.** A refused league-season is printed as UNRESOLVED and not
written , **the leader being unknown to us is not the same as there being no leader.**

**THE GATE WAS RUN BEFORE IT WAS TRUSTED, AND IT AGREES WITH THE DELETE EXACTLY.** The script is
read-only (it stages a CSV, it does not write), so it was executed against the live database:
**it now resolves 94 league-seasons and prints 38 as UNRESOLVED, and of the 110 `top_assists` rows
still live, it refuses ZERO.** So the gate removes precisely the ten rows already deleted and
contradicts nothing that remains. The withheld seasons are the ones you would expect from the
coverage the platform already discloses , **BPL 2013 to 2019 at 0.0%, PRT 2013 and 2014 at 0.0%,
ERE 2010 to 2014 at 0.3 to 1.5%** , and each now prints what it WOULD have written, which is the
audit trail the old guard never produced (`ERE 2014: only 1 of 334 cards, would have written
M. Depay on 5`).

**ONE RESIDUAL, AND IT IS A DIFFERENT AND MILDER DEFECT: TIES ARE BROKEN ARBITRARILY.** The fixed
writer would ADD exactly one row, `L1 2023 O. Dembele 8a`, and that league-season is **84.3%
covered**, so it is not a sparsity artefact. It is a **four-way tie on 8** (Del Castillo,
Aubameyang, Dembele, A. Gomes) and the script writes whichever it saw first. **The coverage gate
cannot catch this and is not meant to.** Only **3 league-seasons** sit in the 25 to 50% coverage
band at all, so the exact placement of the bar barely matters in practice; tie-breaking does.

**THE MATVIEW LAGS THE FIX AND THAT IS A KNOWN, NAMED STATE.** `h_top_assists` mirrors the honours
table, so until `player_card_mv` is refreshed the rankings pills and the honours filter still show
the deleted honour , measured immediately after the delete: **120 cards still flagged, should be
110.** The card face, glance, cabinet and Compare all read the `honours` table LIVE and were
correct the moment the rows went. **The refresh is Lucas's lane** , re-confirmed this session, the
`exec_sql` route died at **8.5 seconds** with `canceling statement due to statement timeout`
exactly as SS C records, and the matview was verified intact afterwards at 57,055 rows.

### THE COVERAGE BAR IS 25% AND SOMEONE WILL READ THAT AS LAX. IT IS NOT, AND HERE IS THE NUMBER THAT STOPS THE TIGHTENING.

**THE BAR WAS NOT CHOSEN, IT WAS PLACED IN A MEASURED EMPTY REGION.** Coverage share across the
120 written rows: **ten rows between 0.5% and 1.9%, then NOTHING AT ALL until 45.0%.** Any bar from
roughly **5% to 44%** refuses exactly the same ten rows and keeps exactly the same 110. **The value
25 carries no information; the EMPTINESS on either side of it does.** That is what makes it
different from the `< 9` guard it replaced, which was a number picked near the symptom and was
beaten by a single assist.

**AND THE TIGHTENING INSTINCT IS WRONG HERE, BECAUSE A HEALTHY LEAGUE-SEASON IS ONLY 50 TO 70%
POPULATED.** That is not a defect, it is the importer's 300-minute floor keeping the tail out, and
SS E records that floor as BY DESIGN. **So the normal case sits barely above the bar, and raising
the bar eats the normal case immediately:**

    bar    rows refused of 120
    25%     10      <- exactly the artefacts
    50%     13
    60%     78      <- REFUSES 78 OF 120 CORRECT ROWS
    70%     90
    80%     92
    90%     99

**AT 60% THE GATE REFUSES 78 OF 120 CORRECT ROWS.** Write that down before touching the constant.
A bar that looks "safer" deletes three quarters of the platform's assist honours, and it would do
it silently, because a withheld season prints as UNRESOLVED rather than as an error.

**THE GENERAL LESSON, AND IT IS THE ONE WORTH KEEPING: WHEN A THRESHOLD SEPARATES TWO POPULATIONS,
PUT IT IN THE GAP AND RECORD THE GAP, NOT THE NUMBER.** A threshold justified by its value invites
adjustment by taste. A threshold justified by a measured discontinuity can only be moved by
re-measuring, and the re-measurement will show whether the discontinuity is still there. **Only 3
league-seasons sit anywhere in the 25 to 50% band**, so the bar's exact placement is nearly
inert in practice, which is itself the evidence that it is not the interesting parameter.

### [CORRECTED 2026-09-12, SAME DAY. THE TIE CLAIM BELOW IS WRONG ABOUT THE DATA AND THE CORRECTION IS THE MORE USEFUL FINDING. READ THIS FIRST.]

**"19 PLAYERS HOLD NO HONOUR THEY EQUALLY EARNED" IS FALSE. EVERY ONE OF THE 14 TIED
LEAGUE-SEASONS ALREADY HOLDS EVERY TIED PLAYER.** Measured directly: ERE 2018 carries both Ziyech
and Tadic, L1 2017 all three of Depay, Neymar and Payet, TR 2019 all three of Bayram, Erkin and
Visca, LL 2017 all three of Messi, Suarez and Fornals, and so on for all fourteen. **110 live rows
across 93 distinct league-seasons, which is 17 rows MORE than one per season.** Nothing was denied
and there is nothing to add.

**THE ERROR WAS MINE AND ITS SHAPE IS THE LESSON: I AUDITED THE WRONG FILE.** `compute_top_assists.js`
does collapse ties, and I read its behaviour as the platform's behaviour. **It is the READ-ONLY
STAGING TWIN , its own header says "NO DB writes" , and the actual write path is
`top_assists_write.js`, whose first line reads "Recompute top-assists (ALL tied players) and WRITE
to honours".** The writer was always correct about ties. **SS C already says to grep the consumer
for the thing that actually changed; the same rule applies to the producer. Before attributing a
data defect to a script, confirm that script is the one that wrote the data.**

**AND CORRECTING IT EXPOSED THE REAL STRUCTURAL FAULT, WHICH IS WORSE THAN THE TIE ONE: THE GUARD
COULD NEVER HAVE FIRED ON ANYTHING IT WROTE.** The writer gated on `mx >= 9` and the staging twin
warned on `val < 9`. **Every row that could exist was >= 9, and every row that could be warned
about was < 9, so the overlap is EMPTY.** The suspect-flag was structurally incapable of flagging a
written row, which is why Van Persie on exactly 9 sailed through both. **A guard and a gate set
from the same constant in opposite directions do not check each other, they cancel.**

**AND THE FIX LANDED IN THE WRONG TWIN FIRST.** The coverage gate was applied to
`compute_top_assists.js`, the file that writes nothing, before anyone checked which file writes.
Both now carry it, and `top_assists_write.js` carries a header saying so. **Same defect class as
`careerStageTags` and the view's two position keys: one rule, two implementations, and only a
comment holding them together.**

**TWO GENUINE DIFFS SURFACED FROM THE DRY RUN AND NEITHER IS A TIE, SO NEITHER WAS APPLIED:**
- **`L1 2023` holds NO top_assists row at all**, while the current data gives a four-way tie on 8
  (Dembele, A. Gomes, Aubameyang, Del Castillo). A missing league-season, not a tie fix.
- **`PRT 2020` IS STALE.** The table holds Grimaldo and Nunez on 9; the data now tops out at
  **Taremi on 10** for FC Porto. **So the honours table has drifted from the data it was computed
  from**, which is a third defect class , snapshot staleness , and it needs its own decision
  rather than being smuggled in behind a tie fix.

**NOTHING WAS WRITTEN AND THE MATVIEW WAS NOT REFRESHED**, because no honour row changed.

### [SUPERSEDED, KEPT FOR THE REASONING] TIE-BREAKING IS ARBITRARY IN THE STAGING SCRIPT (logged 2026-09-12)

**THE SCRIPT WRITES WHICHEVER TIED PLAYER IT HAPPENED TO ITERATE FIRST.** `if (!cur || o[metric] >
cur.val)` keeps the first maximum and every later equal is pushed to a `ties` array that is
**logged and then discarded.** So the honour goes to an arbitrary member of the tied set, decided
by pagination order.

**MEASURED 2026-09-12 OVER THE 94 RESOLVED LEAGUE-SEASONS: 14 HAVE A TIE AT THE TOP, 14.9%.**
Counted independently from the matview and cross-checked against the script's own tie counter,
which reported the same 14.

    players sharing the top value:  1 player 80 seasons | 2 players 10 | 3 players 3 | 4 players 1

**[FALSE, SEE THE CORRECTION ABOVE: all 19 are already written.] The claim was that 19 players hold
no honour they equally earned.** It would have been true had the staging script been the writer. Examples: **ERE 2018 Ziyech and Tadic both
on 13; L1 2017 Depay, Neymar and Payet all on 13; SA 2015 Pjanic and Pogba both on 12; LL 2018
Sarabia and Messi both on 13; L1 2023 a FOUR-way tie on 8.**

**THE COVERAGE GATE CANNOT CATCH THIS AND IS NOT MEANT TO.** L1 2023 is **84.3% covered**, which is
among the best on the platform, and still resolves to an arbitrary pick of four.

**THE PROPOSAL, NOT APPLIED: WRITE EVERY TIED PLAYER.** Three things support it:
- **The schema already permits it.** `honours_one_per_award` is UNIQUE on `(honour_type,
  season_year, league_code, api_player_id)`, so two players CAN both hold one award for one
  league-season. The constraint was built for this.
- **THE PLATFORM ALREADY DOES IT FOR GOLDEN BOOT.** `golden_boot` carries **two** computed rows for
  TR 2025/26, Shomurodov and Onuachu, both on 22. **So the precedent exists, in the same table,
  written by the same pass**, and top_assists is the outlier for collapsing a tie rather than the
  other way round.
- **It matches the sport.** Shared leadership in assists is ordinary and real awards are shared.

**THE ONE CAVEAT THAT MUST TRAVEL WITH IT: A TIE IN OUR DATA IS NOT PROOF OF A TIE IN THE SEASON.**
At 84.3% coverage the true leader may simply be one of the 15.7% we do not hold, and **a tie at a
LOW value is itself a coverage tell** , four players sharing 8 in Ligue 1 is more likely a sign the
real leader is missing than that four men genuinely led. **Writing all tied players is strictly
better than picking one at random, and it is still a computed answer from incomplete data.** It
does not remove the argument for sourcing the winner externally; it removes an arbitrary choice.

### [DECIDED 2026-09-12: A FULL ERA FILL OF assists IS REJECTED. ONE STRUCTURAL FACT CLOSES IT PERMANENTLY.]

**THE PERCENTILE POOLS ARE NOT PARTITIONED BY SEASON, SO THERE IS NO SUCH THING AS AN ERA-BOUNDED
FILL.** Read from the LIVE view, 17,115 chars, on 2026-09-12: **eleven `PARTITION BY` clauses and
not one carries `season_year`.**

    percent_rank() OVER (PARTITION BY (COALESCE(s.pool, s.pos)) ORDER BY s.gaw90) AS pos_pct

**Every pool mixes 2010 with 2025.** So filling 2010-2015 completely would still leave **12,718
null-assist cards from 2016 onward inside the same pools**, which makes a "full era fill" **a
PARTIAL FILL of every pool** , the exact operation already measured at 3.1x to 8.3x worse per card
than a complete one. **The era boundary is a property of the DATA, not of the scoring, and the
scoring is what the fill would distort.**

**AND THE REAL SCOPE FOLLOWS FROM THAT: 31,040 CARDS ACROSS 2,422 OF 2,740 CLUB-SEASONS, 88% OF THE
DATABASE.** Not 18,322 across 1,018. The 2016+ half is the larger one by sourcing unit (1,378
club-seasons against 1,018) and it is **not a fringe tail**: median minutes on a null-assist 2016+
card is **1,136**, and **7,647 of them have 900+ minutes**. The two eras also differ in shape, and
the modern one is harder: pre-2015 is all-or-nothing (861 of 1,018 club-seasons are >=90% missing),
while 2016+ is mostly **half-populated squads** (705 club-seasons at 25-50% missing), which must be
reconciled against existing values rather than filled into an empty sheet.

**THIS IS THE FINDING THAT CLOSES THE QUESTION, AND IT CLOSES IT FOR ANY FUTURE VARIANT.** Top ten
clubs, fifty players, one era, one league: all of them are partial fills of a cross-era pool.
**The only non-distorting fill is all 31,040, and the only other honest option is none.**

**FEASIBILITY, SECONDARY BUT CONSISTENT.** **API-Football holds assists for 117 of 18,322 pre-2015
cards, 0.6%**, so there is no provider route and the job is scrape or manual research:
**50,000 to 60,000 player-facts** sourced to write 31,040 values, roughly **13x everything
`known_players.csv` holds** (2,385 rows, accumulated over months). **And that lane has broken
mid-job once already** , SS E records the tier-1 Transfermarkt pass dying at **122 of 474 cards**
after a markup change, leaving ~350 unresolved to this day. **A half-finished assists fill is
strictly worse than none**, because it is precisely the partial fill rejected above.

### THE PRE-2015 ASSISTS WE DO HOLD ARE A DIFFERENT SOURCE FROM THE POST-2015 ONES, AND THEY WERE SELECTED FOR FAME (found 2026-09-12)

**THE DEFINITIONAL SEAM IS NOT A FUTURE RISK OF SOURCING. IT IS ALREADY IN THE COLUMN, AND IT SITS
EXACTLY ON THE ERA BOUNDARY.**
- **Post-2015 assists are API-Football.** `scripts/import/import-players.js` calls
  `https://v3.football.api-sports.io` and maps `goals.assists`.
- **Pre-2015 assists are hand research verified against FBref.** `CLAUDE_ARCHIVE_2026-07.md`
  records the NR-ASSIST FILL: *"71 rt>=85 pre-2016 marquee cards had NULL assists... CCC verified
  all 71 vs FBref domestic-league splits"*, and *"101 assists backfilled (22 marquee + 79 World
  Class), FBref domestic, verified."*

**MEASURED, AND THE SELECTION EFFECT IS EXTREME: the 117 pre-2015 cards carrying an assist figure
have a MEDIAN rt OF 88, and 89.7% of them are rt>=85. The control, all 16,595 scored pre-2015
cards, has a median rt of 42 and 0.8% at rt>=85.** The populated set is not a sparse random sample
of the era. **It is the elite, filled deliberately.**

**AND THAT FINALLY EXPLAINS WHY THE BAD top_assists ROWS LOOKED PLAUSIBLE.** The computed "league
assists leader" for a pre-2015 season was the maximum of a set that had been **selected for fame**,
so it always landed on Messi, Van Persie, Suarez, Giroud or Nene. **A sparse maximum over a random
sample looks obviously wrong; a sparse maximum over a hand-picked elite subset looks right.** That
is why it survived from July to September.

**THE DURABLE RULE, AND IT IS WHY THIS DEFECT SURVIVED TWO MONTHS: A SELECTIVE FILL MAKES EVERY
COMPUTED EXTREME LAND ON A FAMOUS NAME AND LOOK CORRECT.** Filling `assists` only for marquee cards
meant the maximum over the populated set was, by construction, a star , Messi, Van Persie, Suarez,
Giroud, Nene. **A sparse maximum over a RANDOM sample looks obviously wrong and gets caught. A
sparse maximum over a sample selected FOR FAME looks exactly like the right answer.** The bias did
not merely fail to help; it actively disguised the defect from every human who glanced at it.

**GENERALISE IT BEYOND ASSISTS: ANY SELECTIVE FILL OF ANY FIELD HAS THIS PROPERTY.** If a backfill
is prioritised by prominence , marquee players, big clubs, high rt, the top of a ladder , then every
maximum, leader, ranking and "best of" computed over that field will be drawn from the prominent
subset and will therefore look plausible whatever the coverage. **The plausibility is manufactured
by the selection, not earned by the data.** Two protections follow: **never compute an extremum
over a field whose fill was prioritised, without gating on coverage first** (which is what the
`MIN_COVERAGE` gate now does), and **when a fill must be selective, record that it was**, because
the next reader cannot infer selection from the values.

**CONSEQUENCE FOR ANY FUTURE SOURCING: the overlap test cannot use pre-2015 as its control**, because
that population is both a different source AND a biased sample. Test a new source against
**2016+ league-seasons at 80%+ coverage**, compare player by player on `api_player_id`, and segment
disagreements by role , a secondary-assist definition inflates creators and leaves strikers alone.

### HONOURS DRIFT MEASURED ACROSS ALL 93 LIVE LEAGUE-SEASONS: 92 EXACT, ONE STALE, AND THE CAUSE IS DATED (2026-09-12)

**THE QUESTION WAS WHETHER PRT 2020 AND L1 2023 WERE TWO OF TWENTY. THEY ARE NOT.** Every
league-season holding a `top_assists` row was recomputed from the matview as it stands today, with
nulls excluded, and compared to the live row:

    exact match (same holders, same value)   92
    value drift (same holders, new value)     0
    WINNER CHANGE                             1
    league-season with no data at all         0

**THE ONE IS `PRT 2020`: live holds Grimaldo and Nunez on 9, the data now tops out at Taremi on 10.**

**AND THE CAUSE IS DATED, WHICH BOUNDS THE WHOLE CLASS.** The honours rows were created
**2026-07-04 17:02:48**. Taremi's card `187377` was created **2026-07-23 18:50:13** , the
**ingestion-gap recovery**, which SS E records as closing on exactly that date with 780 seasons
recovered. Measured: **exactly 780 cards carry a `created_at` after the honours run, 526 of them
carry assists, and they touch 69 distinct league-seasons.** Grimaldo's card predates it
(2026-06-11).

**SO THE EXPOSURE WAS 69 LEAGUE-SEASONS AND EXACTLY ONE ACTUALLY CHANGED HANDS.** The other 68
gained cards that did not top their league. That is the measurement, and it is reassuring rather
than alarming.

**THE DURABLE RULE IS THE ONE THIS PLATFORM KEEPS RE-LEARNING: `honours` IS A SNAPSHOT COMPUTED AT
A MOMENT, AND AN INSERT-ONLY INGESTION CAN INVALIDATE A WINNER WITHOUT TOUCHING A SINGLE EXISTING
ROW.** Nothing recomputes it, nothing warns, and the stale row looks identical to a correct one.
**It is the third snapshot of this kind on the platform, after `RADAR_POOL_REF` and
`KEEPER_SAVE_LADDER`** , and unlike those two it is not even documented as a snapshot. **Add it to
the list of things that must be regenerated after any population-moving write.**

**PRT 2020 AND L1 2023 BOTH REMAIN PARKED, UNTOUCHED, BY DECISION.**

**NOT DONE, DELIBERATELY: external sourcing of the real winners.** It is a separate decision and it
carries an unsolved problem , see the entry below.

**AND THE OPEN PROBLEM IT WOULD CREATE, RECORDED NOW SO IT IS NOT DISCOVERED LATE.** Sourcing the
true winner for 2010-2015 means **46 of 54 league-seasons are more than 90% null on assists, and 36
of 54 currently carry no `top_assists` row at all.** `golden_boot` needs NONE of this , it is
already `wikipedia_ccc` on a 0.4%-null column. **But the sourced winner's own card would contradict
itself:** measured, David Silva's PL 2011/12 card reads **`assists = NR`**, and `vv-core.js` sets
`assistsText: (row.assists != null ? String(row.assists) : 'NR')`, so the card face would print a
**Top Assists pill directly above an ASSISTS column reading NR.** The `honours` table already has
its own `assists` column, so the likeliest answer is to print the sourced figure in the honour row
itself, but **that is a copy decision and it must be made before any sourcing, not after.**

---

## A POSITIONS SCRIPT SILENTLY WRITES `assists`, WHICH FEEDS THE SCORE, AND ONE OF ITS 28 VALUES MANUFACTURED A FALSE LEAGUE LEADER (found 2026-09-12, LOGGED NOT REVERTED)

**`scripts/enrichment/write_positions3.js` IS NAMED FOR POSITIONS AND ALSO WRITES A SCORING FIELD.**
After its position work it runs a second, unannounced pass:

    // ---- ASSISTS (player_season_cards.assists, fill-only WHERE assists IS NULL) ----
    .update({ assists: v }).eq('id', cid).is('assists', null)
    console.error('ASSISTS (fill-only): filled ... [rt will move on refresh]')

**Its own log line admits the consequence , `[rt will move on refresh]` , so this was known to the
author and is invisible to everyone since.** The values come from a hardcoded 28-entry `ASSIST`
map at the top of the file, keyed on `card_id`.

**WHY IT IS A DEFECT RATHER THAN A SHORTCUT.** A job named for one field writing another is
undiscoverable by the obvious means: nobody auditing `assists` provenance greps a positions script,
and SS C's own provenance line was wrong for months partly because of lanes like this one. **The
fill-only guard (`is('assists', null)`) is correct and is not the problem.** The problem is that
**an rt-touching write is hidden inside a job whose name promises it touches nothing of the kind.**

**THE SPECIFIC CONSEQUENCE, AND IT IS THE STRONGEST EXAMPLE ON THE PLATFORM OF A SMALL HAND-FILL
DOING LARGE DAMAGE: `Nene 2010 L1 = 9` CAME FROM THIS MAP, AND THAT SINGLE VALUE MANUFACTURED A
FALSE LEAGUE ASSISTS LEADER THAT SURVIVED UNTIL 2026-09-12.** Ligue 1 2010/11 held three populated
assist cards out of 382. `compute_top_assists`/`top_assists_write` took the maximum of those three,
Nene's hand-written 9 was the largest, and he was crowned the league's top assister. **The honour
propagated to his card face, his glance, his cabinet and the rankings filter, and it was deleted
this morning along with nine siblings.** **One research value, entered to fix a different problem,
produced a public false claim.**

**ALL 28 VALUES, NAMED SO THEY CAN BE CHECKED. Stored value matches the written value on every one
(verified 2026-09-12), so nothing has drifted since; the question is whether each is CORRECT.**
Seven are pre-2015 and therefore sit in the sparse window where a single value can decide a league.

    card_id  season lg   player                     club                  assists   rt
    156662   2010   BL   L. Barrios                 Borussia Dortmund        2      84
    180524   2010   BPL  J. Vossen                  Genk                     6      87
    163158   2010   L1   Nene                       Paris Saint Germain      9      85   <- made a false leader
    180202   2011   BPL  J. Vossen                  Genk                     2      85
    174565   2011   ERE  O. Toivonen                PSV Eindhoven            2      78
    174592   2011   ERE  J. Guidetti                Feyenoord                6      84
    168807   2011   PRT  Rodrigo Jose Lima Dos S.   SC Braga                 7      81
    173082   2015   ERE  M. Kramer                  Feyenoord                4      79
    161304   2015   L1   R. Ghezzal                 Lyon                     8      76
    167554   2015   PRT  Bryan Ruiz                 Sporting CP             12      78
    167555   2015   PRT  M. Layun                   FC Porto                13      76
    172746   2016   ERE  J. Toornstra               Feyenoord                9      84
    172351   2017   ERE  J. Toornstra               Feyenoord               10      76
    172521   2017   ERE  M. van Ginkel              PSV Eindhoven            4      77
    160409   2017   L1   Rony Lopes                 Monaco                   5      83
    166668   2017   PRT  Ricardo Horta              SC Braga                 8      80
    183949   2017   TR   Talisca                    Besiktas                 7      82
    184247   2017   TR   Giuliano                   Fenerbahce               5      79
    170986   2021   ERE  G. Til                     Feyenoord                3      77
    182248   2021   TR   A. Nwakaeme                Trabzonspor             10      80
    170205   2023   ERE  J. Bakayoko                PSV Eindhoven            9      79
    181398   2023   TR   O. Aydin                   Fenerbahce               8      79
    169768   2024   ERE  I. Saibari                 PSV Eindhoven           11      81
    169280   2025   ERE  A. Hadj-Moussa             Feyenoord                6      75
    169343   2025   ERE  G. Til                     PSV Eindhoven            4      78
    169346   2025   ERE  I. Saibari                 PSV Eindhoven            8      82
    163392   2025   PRT  Pote                       Sporting CP              8      78
    180654   2025   TR   Talisca                    Fenerbahce               4      82

**NONE OF THE 28 CURRENTLY HOLDS A `top_assists` HONOUR** , Nene's was deleted, and no other one
ever won its league-season. **So the live exposure is to rt only, through `gaw`, not to any honour.**

**[DECIDED 2026-09-12 AFTER READING THE LIST: THE 28 VALUES STAY. DO NOT REVERT THEM.]** They are
researched values, the marquee batch was verified against FBref domestic-league splits, and none of
the 28 holds an honour, so **the live exposure is `gaw` only.** **Reverting would remove real data
to fix a routing problem**, which is the wrong trade and would leave 28 cards scored on an assumed
zero , the very defect the COALESCE entry is about. The values are not in question. The ROUTE is.

**WHAT THE ROUTE FIX WOULD TAKE, SCOPED NOT DONE.** Lift the 4-line `ASSIST` const and the ~13-line
fill-only block into their own named script, e.g. `write_assists_ccc.js`, and delete both from
`write_positions3.js`.
- **NOTHING BREAKS, CHECKED:** the file is a 117-line standalone CLI, **nothing imports it**
  (`grep` across every tracked `.js` finds no reference), and the **dictionary append writes
  POSITIONS ONLY** (`[t.api, t.sy, t.pos, SOURCE, CLASSIFIED_DATE]`), so the assists block shares
  nothing with it but the Supabase client and the enclosing IIFE.
- **IT IS ALREADY A NO-OP TO RE-RUN.** The update is `.is('assists', null)` and all 28 are now
  populated, so re-running either half writes nothing. **The move is therefore zero-risk to data.**
- **THE ONE REAL COST IS PROVENANCE.** This file is the only record that these 28 values exist and
  where they came from. **The new script must carry that history in its header, and this entry must
  point at it**, or splitting the code destroys the paper trail , which is the same mistake as the
  routing problem, one step later.
- **AND THE TAIL NEEDS A DECISION:** the script ends by attempting a matview refresh through three
  RPC names. Whichever half keeps it, the other must not silently skip it.

---

## THE PLAYBOOK KEYS THREE MAPS ON A DISPLAY STRING, SO A COPY CHANGE IS A CODE CHANGE (found 2026-09-12, NOT REFACTORED)

**WHAT IT COST TODAY, WHICH IS THE ONLY REASON THIS IS WORTH WRITING DOWN.** Renaming two honours
(`League Champion` to `League Title`, `UCL Winner` to `UCL Champion`) should have been one edit to
`HONOUR_META.label`. It was **eight**, across two files, because the Playbook does not read
`HONOUR_META` at all , it holds its own copies keyed on the NAME:

    playbook.html   <div class="hn">League Champion</div>     the visible label
                    data-h="League Champion"                  the click key
                    HON_KEY  {"League Champion": 'league_champion'}   name -> mark key
                    HON_COPY {"League Champion": {td, dq}}            name -> the expanded copy
                    HON_RANK ["...","League Champion",...]            name -> display order

**AND THE FAILURE WOULD HAVE BEEN SILENT, IN BOTH DIRECTIONS.** Change `HONOUR_META` alone and the
Playbook keeps teaching a name nothing else uses. Change the markup alone and `HON_KEY` misses, so
`honMark()` returns '' and **the trophy renders blank with no error** , the same `<use>`-with-no-
symbol failure SS C already records. `HON_COPY` misses too, so "See more" opens an empty panel.

**ONE GUARD EXISTS AND IT ONLY COVERS ORDER.** `honFill()` compares the DOM's `data-h` sequence to
`HON_RANK` and `console.warn`s on a mismatch , deliberately a warn, not a throw, because a wrong
ORDER is cosmetic. **It cannot see a name that was changed consistently in the markup and not in
`HON_KEY` or `HON_COPY`**, which is the likelier mistake.

**THIS IS THE TWO-COPIES-OF-ONE-DECISION SHAPE, WHICH SS C RECORDS AGAINST `eligibility()`, AGAINST
THE VIEW'S TWO POSITION KEYS, AND AGAINST `careerStageTags`.** The distinguishing feature here is
that the shared key is a **human-readable string that someone will want to edit for copy reasons**,
so the pair is guaranteed to be pulled apart eventually. It is the same class as the deleted
`HONOUR_ICON` and `WT_TAG_ICON` lookups, which SS C says must never gain a third member.

**THE FIX, NOT DONE NOW, RECORDED SO THE NEXT PERSON HAS IT: key on the honour KEY, never the
name.** `HON_KEY` disappears entirely (the key is already the key). `HON_COPY` and `HON_RANK`
become `{ league_champion: ... }` and `['ballon_dor', ...]`. The markup carries
`data-h="league_champion"` and the visible `.hn` text is read from `HONOUR_META.label` at load, the
way `.hmk` already reads its mark. **After that a rename is one edit in `vv-core.js` and the
Playbook follows automatically** , which is the whole point.

**IT ALSO REMOVES A REAL HAZARD BEYOND TIDINESS:** the `hc-` element ids are ALREADY keyed on the
honour key (`id="hc-league_champion"`), so the file currently uses both conventions side by side
and only the string-keyed half breaks on a rename.


---

## KNOWN LIMITATION, NOT A DEFECT: RANKINGS CAN NEVER SHOW A LEAGUE TITLE OR A UCL CHAMPION (measured 2026-09-12)

**SOMEONE WILL EVENTUALLY NOTICE THAT RANKINGS LOOKS THIN ON HONOURS AND GO HUNTING. This is the
answer, and it is architecture rather than a bug.** `league_champion` and `ucl_winner` are
**card-and-compare only, by construction**.

**THE MEASUREMENT, so nobody re-derives it:**

    honours WHERE honour_type = 'league_champion'   143 rows,  0 carry an api_player_id
    honours WHERE honour_type = 'ucl_winner'         16 rows,  0 carry an api_player_id

**Both are keyed by TEAM, never by player.** They are stored as a club-season fact
(`team_name` + `season_year` + `league_code`) and reach a card only as a **computed team leg**:
`loadTeamHonours()` builds a lookup, and `teamHonoursFor(card, cache)` matches the card's club and
season against it. That match needs the player's CAREER ROWS.

**AND RANKINGS HAS NO CAREER ARRAY.** `grep -c "SEASON_RAW\|cabinetWithTeamLegs\|teamHonoursFor"
rankings.html` returns **0**. Rankings holds one row per card and never loads the seasons around
it, so it cannot compute a team leg even in principle.

**CONSEQUENCE, STATED PLAINLY: a rankings row or grid card can show Ballon d'Or, World Cup, Player
of the Season, Golden Boot and Top Assists , the five that ARE player-keyed , and can never show
that the player won his league or the Champions League.** Verified rendered on the preview: a
search for Haaland returns seven cards showing POTS and Golden Boot and neither team honour, while
the same player's CARD shows UCL Champion and League Title on the face.

**THIS IS ALSO WHY A LABEL CHECK ON RANKINGS CANNOT CONFIRM THOSE TWO STRINGS.** They are in the
shared `HONOUR_CHIP_LABEL` and rankings reads that map, but no rankings card in the data can
exercise those two entries. **An absence there is not evidence of a fault, and not evidence of a
pass either.**

**WHAT IT WOULD TAKE TO CHANGE IT, AND IT IS CHEAPER THAN IT LOOKS , THE DATA IS ALREADY THERE.**
The 2026-09-04 matview swap added six `h_*` honour flags, and two of them are exactly these:
**measured 2026-09-12, `h_league_champion` is true on 2,872 cards and `h_ucl_winner` on 335.** Those
columns are ON `player_card_mv`, so **rankings already has them on every row it renders** , that is
precisely why the honours FILTER works server-side there.

**So a rankings pill needs no career array and no fan-out: the flag is enough to say "he won it".**
A pill is a label plus a mark, both keyed on the honour type, and the type is implied by the flag.
**What the flag CANNOT give is the YEAR or the count**, which the card's cabinet shows and which
would simply be absent here , the same shape as the glance, which is uncapped and prints no count.

**NOT PROPOSED, DELIBERATELY.** It changes what a rankings row asserts, and SS C's tag-cap rules
already govern that space , prestige renders outside the cap, honours compete with profile tags for
`remaining` slots, and there are FOUR tag-render paths a change would have to be checked against.
**It is a product decision about row density, not a missing feature.** The alternative route,
loading a career array into rankings, is the expensive one and is the thing rankings deliberately
avoids.

**AND NOTE THE ASYMMETRY THAT MAKES THIS CONFUSING: the honours FILTER on rankings already works
for league champion and UCL**, because it reads `h_league_champion` and `h_ucl_winner` off the
matview. So a reader can FILTER rankings to league champions and then see no league-champion pill
on any of the results. That is the limitation at its most visible, and it is worth knowing before
anyone reports it as a rendering bug.
