# VVonderXI — Hygiene / Bug / UX backlog (captured 5 Jul, from Lucas)

## DATA-INTEGRITY BUGS (do early)
1. **World Cup tag = SEASON-SPECIFIC, not career-wide.** [BUG — reverse a design choice]
   - Current: world_cup_winner was built as a CAREER honour → shows on EVERY card for that player (Messi's 2011/12 card shows World Cup). 
   - Wanted: show ONLY on the season it was won (Messi = 2022 only), like all other honours/trophies.
   - Fix: in fetchHonours, treat world_cup_winner like a season honour (match season_year), NOT career-wide. Remove the career array's always-attach behavior. The honour's season_year (2010/14/18/22) becomes the match key.
   - Note: this means WC only shows if the player has a CARD for that exact season. Acceptable (matches "trophies show on the season won").

## RENDER BUGS
2. **Honour tags not on card FACE in search/list views.** [BUG]
   - Honours show in the glance (expanded), but rankings/search CARD view + LIST view still show only PROFILE tags — the card-face priority-fill (Prestige→Honours→Profile) isn't applied in the rankings/search render path (only card.html buildCard has it).
   - Fix: apply the same honour priority-fill to the rankings/search card render. Check whether rankings uses buildCard or its own render; wire honours + the slot logic there too. (Requires honours fetched in the rankings/search data path — may need the join there.)
3. **Wonder Tags section broken on mobile.** [BUG]
   - The tap-expandable #wonderTags (honours + profile) is broken on mobile. Investigate — could be the honour .tagrow additions or a pre-existing mobile issue. Verify tap-toggle .open still fires.

## DESIGN / DISPLAY
4. **Custom branded accolade icons.** [DESIGN — polish, not blocking]
   - Replace generic SVG honour icons with branded, symbolic custom icons per accolade (Ballon d'Or, World Cup, UCL, League, POTS, Golden Boot, Top Assists). Our own visual language. Queue as a design pass AFTER the bugs.
5. **Accolades divided by category (Team / Individual / Career).** [DESIGN — already speced]
   - The fold/unfold grouped section (HONOURS_PLAYBOOK_SPEC) not yet built. Accolades need visible division into Team / Individual / Career.
6. **Honours AHEAD of profile tags on the card face.** [CONFIRMED — keep as built]
   - Decision: yes, honours lead profile (achievement > characterization; rarer, weightier signal). The priority-fill (Prestige→Honours→Profile) is correct. Caveat: slot caps (2-3 honours on face) prevent an all-gold card.

## UX — FILTERS / SEARCH / SORTING (rankings + compare)
7. **Sticky filter on scroll (e-commerce pattern).** [UX]
   - Rankings/search: scroll down then scroll UP → the filter bar reappears/sticks at top, so the user never scrolls all the way up to reach filters. Standard e-commerce sticky-on-scroll-up behavior.
8. **Unify Compare's picker/filter with Rankings.** [UX — this is the C7 decision, now MADE: unify]
   - Compare's player-select view + filter is a DIFFERENT structure from rankings. Unify them: same filter taxonomy, same tags, same search. Lucas confirms: yes, reuse Rankings' system in Compare.
9. **Updated filter taxonomy + filterable + dynamic sorting.** [UX/DATA]
   - Filter list must reflect the CURRENT tags (19 profile + honours + prestige — we changed/added tags). Make the new tags filterable. Add the dynamic sorting option (discussed).
   - Also folds in: the stale rankings filter-chip fix (Deep-Lying Playmaker→Regista, Ball-Playing Defender→Ball-Playing CB) — trace rowToCard tag source, rename to emitted names.

## PRIORITY ORDER (proposed)
A. World Cup season-specific fix (#1) — data integrity, quick, visibly wrong now.
B. Honour tags on card face in search/list (#2) — honours invisible where users browse.
C. Mobile Wonder Tags fix (#3) — broken feature.
D. Accolades category division (#5) + honours-ahead confirmed (#6).
E. Filter/sort work (#7, #8, #9) — sticky filter, unify Compare picker, updated taxonomy + dynamic sort. (Bigger, groups with the Compare build.)
F. Custom branded icons (#4) — design polish, last.
