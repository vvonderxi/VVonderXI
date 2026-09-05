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
