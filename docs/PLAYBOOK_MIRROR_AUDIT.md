# Playbook Mirror-Audit — reconcile playbook.html to what the engine ACTUALLY emits
**Rule (locked): the Playbook mirrors ONLY what exists. Remove orphans, add missing, fix name mismatches.**

Based on the live reads (vv-core.js getVVTags + bandFor + the honours table). This is the reconciliation map for the playbook.html edit.

---

## 1. HONOURS — engine/DB has 7; playbook advertises 6 (missing World Cup)
KEEP + define all 7 (Winter one-liners, era-correct award names):
- Ballon d'Or
- League Champion
- UCL Winner
- Golden Boot
- Top Assists
- Player of the Season  (note the award-name lineage per league — see HONOURS_PLAYBOOK_SPEC.md)
- **World Cup Winner** ← ADD (career accolade; currently missing from playbook)

ACTION: add World Cup Winner; ensure all 7 have Winter one-liners; add the POTS per-league award-name note.

---

## 2. PRESTIGE — engine emits 2; playbook advertises 16 (14 orphans)
The engine's prestigeFor(band) returns ONLY:
- **Generational Season** (Generational band, rt ≥95)
- **Iconic Campaign** (Elite band, rt ≥90)

Playbook ALSO advertises (NOT computed — orphans): Role Breaker, Legacy Season, Unplayable, The Carry, One-Club [Icon], The Last Dance, The Difference Maker, The Untouchable, The Phenomenon, The Golden Season, The Provider, The Romantic Season, Talisman, [+ any others].

ACTION (cut-to-real for launch): REMOVE the 14 orphan prestige tags from the playbook. Keep only Generational Season + Iconic Campaign, and ADD their missing definitions (the reported gap). 
FAST-FOLLOW (optional, post-launch): selected orphans may be worth BUILDING into prestigeFor — triage later. For launch, playbook shows only the 2 real ones.

Also: the band DISPLAY renames (Exceptional→"Established" etc. happen at render). Playbook should use the PUBLIC display names, but the underlying prestige badges are the 2 above.

---

## 3. PROFILE TAGS — engine emits 19; playbook has name mismatches + orphans
ENGINE ACTUALLY EMITS (19, the source of truth — vv-core.js getVVTags):
Goal Machine, Marksman, Clinical, Provider, Poacher, The Winger, Playmaker, Maestro, Regista, Engine Room, The Dribbler, The Wall, Destroyer, Ball Hawk, Ball-Playing CB, [Complete?], The Last Dance, [+ the AGE/character ones the logic emits].
Families: ATT / MID / DEF / CROSS / AGE. (GKs earn no profile tags in v1.)

NAME MISMATCHES to fix in playbook (playbook name → engine name):
- Deep-Lying Playmaker → **Regista**
- Ball-Playing Defender → **Ball-Playing CB**
- Workhorse → **Iron Man**  (the draft still says Workhorse; deployed = Iron Man)
- Elite Finisher → **Goal Machine / Marksman** (confirm which the engine emits)

ORPHANS in playbook (advertised, NOT emitted by engine — REMOVE or BUILD):
Pace Merchant, Showman, Target Man, False Nine, Aerial Threat, Anchor, Box-to-Box, Goal-Getter, The Reader, The Stopper, The General, Elite Keeper, Shot-Stopper, Sweeper-Keeper, The Commander, The Saviour, Wonderkid(?), Rising Talent, Peak, Veteran, Twilight, Breakout, Mr Consistent, Big-Game[Player], Super Sub, Press-Resistant, [all keeper tags].

ACTION (cut-to-real): the playbook's profile section must list EXACTLY the 19 the engine emits, with correct names. Remove the orphans. (Keeper tags all orphaned — GKs earn no profile tags in v1; either state that honestly or omit the keeper section.)
FAST-FOLLOW: some orphans are good (Wonderkid, Box-to-Box, False Nine) — candidates to BUILD into getVVTags later. For launch, playbook = the real 19.

NOTE: confirm the exact 19 against a fresh read of getVVTags before editing (the list above is from the probe; verify emitted names precisely — don't guess).

---

## 4. VERDICT / COMPARE TAGS — engine (compare mode) emits 11; playbook advertises 11
These appear aligned (Different Worlds, A Masterclass, A Clear Edge, VAR close call, Photo Finish, Class Across Eras, League Strength[?], Complete Package vs Specialist, The Debate Lives On, Bragging Rights Settled, [+1]).
ACTION: verify the compare-mode tag names against the live Compare logic when we build Compare; reconcile then. Lower priority (Compare isn't built yet).

---

## SUMMARY OF EDITS TO playbook.html
1. Honours: add World Cup Winner (7 total); ensure Winter one-liners + POTS award-name note.
2. Prestige: cut 14 orphans; keep Generational Season + Iconic Campaign; ADD their definitions.
3. Profile: fix 4 name mismatches; cut the orphans; list exactly the engine's 19; handle keeper section honestly (no GK profile tags in v1).
4. Verdict: defer to Compare build.

PRINCIPLE: no orphans, no promises. Every tag in the playbook must be one the engine emits or a honour that exists. Verify emitted names against a fresh getVVTags read before finalizing.
