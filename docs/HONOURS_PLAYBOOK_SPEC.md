# Honours — Playbook + Display Spec (LOCKED 2026-07-04)

## The complete honour set (this is EXACTLY what exists — no more, no less)
The honours table contains SIX honour types. The Playbook, Wonder Tags, and any tag surface must reflect EXACTLY these. Nothing else.

| Honour type | Rows | What it is | Official award name(s) |
|---|---|---|---|
| league_champion | 143 | Won the domestic league that season | (the league title) |
| ucl_winner | 16 | Won the Champions League | UEFA Champions League |
| ballon_dor | 14 | Won the Ballon d'Or | Ballon d'Or |
| golden_boot | 141 | League top scorer | (league top scorer) |
| top_assists | 120 | League top assister (computed, ≥9 credible) | (league assist leader) |
| player_of_season | 102 | The league's recognised best-player-of-the-season honour, across award name changes | see per-league names below |

### Player of the Season — the continuous best-player honour, across award-name changes
Player of the Season = the league's recognised best-player-of-the-season honour. The AWARD NAME changed over time; the HONOUR is continuous. Use the era-correct official name in expansions:
- Premier League → **PFA Players' Player of the Year** (2010/11–2015/16) → **Premier League Player of the Season** (2016/17+)
- La Liga → **LaLiga Best Player** (LFP Awards)
- Serie A → **AIC Serie A Footballer of the Year** (player-voted, to 2017/18) → **Serie A MVP** (official 2018/19+)
- Bundesliga → **German Footballer of the Year** (to 2018/19) → **Bundesliga Player of the Season** (2019/20+)
- Ligue 1 → **UNFP Ligue 1 Player of the Year**
- Primeira Liga → **LPFP Primeira Liga Player of the Year**
- Eredivisie → **Dutch Footballer of the Year (Gouden Schoen)**

## RULE: the recognised best-player award per league (Rule A, LOCKED)
Keep the recognised best-player-of-the-season award for each league, across name changes — it is ONE continuous honour. The ONLY exclusion: an award instance where the winner was NOT in that league that season (the award honours a nation's players generally, not the league). Confirmed drop: Toni Kroos 2017/18 German FotY (he was at Real Madrid, not in the Bundesliga). All other German FotY winners WERE in the Bundesliga → kept.
Not-awarded seasons (COVID) are skipped: Ligue 1 2019/20, Eredivisie 2019/20.

## PLAYBOOK TASK (must do during tag-system build) — applies to ALL tag types, not just honours
THE PLAYBOOK MUST MIRROR ONLY WHAT ACTUALLY EXISTS ON THE CARDS / IN THE LOGIC. It is a mirror of reality, not a wishlist. This applies across EVERY category:

1. **Honours** — define EXACTLY the six honour types above (Winter-voice one-liner each; era-correct award names for Player of the Season).
2. **Prestige profiles / bands** — define EXACTLY the prestige tiers that exist in the live engine/logic (e.g. Generational, Iconic, Elite, World Class, Standout — confirm the actual set + thresholds against vv-core.js). If the Playbook lists a band that isn't in the logic, remove it. If a band exists in logic but isn't defined (the reported Generational ≥92 / Iconic 88–91 gap), add it.
3. **Wonder Tags** — define EXACTLY the wonder tags that the tag logic can actually produce (Wonderkid, etc.). Remove any Playbook entry for a tag the logic doesn't generate.
4. **Position tags** — the 8-bucket vocabulary (GK/FB/CB/CDM/CM/CAM/Winger/ST) — match the Playbook to these exactly.

**THE RULE (LOCKED): if a tag / profile / honour / band does NOT exist on the cards or in the logic, it must NOT be in the Playbook. No orphans, no promises of things that don't exist. Conversely, everything that DOES exist should be defined.**

**Audit process:** read playbook.html → inventory every tag/profile/band/honour it currently defines → compare against what actually exists in the logic + data → REMOVE orphans, ADD missing, correct names/thresholds. Do this for all four categories above.

## DISPLAY / EXPANSION (fold-unfold) — consistent with existing tone
- Tag hover (or tap on mobile) = **definitional one-liner, Winter voice** (authoritative, what the honour IS). E.g. "Golden Boot — the division's leading scorer."
- Tag unfolded / expanded = **contextual story, Drury voice** (poetic, what the player DID that season), generated at runtime from facts + stats + the honour + the official award name. E.g. "Named UNFP Ligue 1 Player of the Year — the season France could not look away."
- Same fold/unfold mechanic and tone already used elsewhere on the card.
- Top-card slot priority: Prestige → Honour → Position (rarer wins the slot).
- Honours = own fold/unfold section, only appears if the player has honours; grouped Team / Individual / Career.

## Voice-by-surface (LOCKED)
- **Winter** (sharp, authoritative): Playbook definitions, tag hover one-liners, engine explanations.
- **Drury** (poetic, emotional): unfolded honour narrative, the Verdict, Chronicle, trajectory.
