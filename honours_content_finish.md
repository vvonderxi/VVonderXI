# Honours content finish — #15 POTS copy, #16 Drury expands, #17 Wonder Tags sections

## #15 — Winter one-liners: stop concatenating context onto the hover
PROBLEM (from screenshot): the hover shows one-liner + " , " + context =
"The league's outstanding player across the campaign. , LaLiga Best Player (LFP Awards) , Official La Liga/LFP Player of the Season award" — clunky, repetitive.

FIX: the HOVER shows ONLY the clean Winter one-liner. The context (era-correct award name) moves to the DRURY EXPAND area (or a clean secondary line), NOT concatenated onto the hover tooltip.

Winter one-liners (FINAL — hover only, no context appended):
- ballon_dor:       "The best player in the world that season."
- world_cup_winner: "A world champion. The prize every player covets most."
- ucl_winner:       "Champion of Europe, the club game's greatest prize."
- league_champion:  "Champions. Top of the league across a full season."
- player_of_season: "The league's finest over a full campaign."   ← tightened (was "outstanding player across the campaign")
- golden_boot:      "The league's top scorer. Nobody scored more."
- top_assists:      "The league's chief creator. Nobody made more."

CODE: in renderHonourChips / renderHonourRows, set data-tip = oneliner ONLY (remove the "+ context" concat).
The context (award name, goals/assists tally) belongs in the EXPAND (Wonder Tags .tmore), not the hover.

## #16 — Drury expansions (the "more" / expand — 7 honour-type paragraphs)
Each honour's EXPAND (Wonder Tags .tmore, or the Playbook entry) shows a Drury-voice paragraph —
the EMOTIONAL meaning of the honour TYPE (general, not per-player). Poetic, evocative.

ballon_dor:
"The Ballon d'Or is football's loneliest honour. Not a team's triumph but one player's, held above all
others for a single season. To win it is to be told, by those who watch closest, that on this earth in
this year, no one played the game better."

world_cup_winner:
"Every four years a nation holds its breath, and for one squad it ends in glory. The World Cup is the
prize a career is measured against, the one that turns a great player into an immortal. Some of the finest
never lift it. Those who do are never forgotten."

ucl_winner:
"European nights are different, and every player knows it. To win the Champions League is to conquer the
best the continent can offer, under the brightest lights, when the margins are thinnest. This is where
legends are made and reputations are sealed."

league_champion:
"A league title is the honest prize. Not one glorious night but nine months of them, the long grind of
winter fixtures and spring nerves, where consistency is everything and there is nowhere to hide. To finish
top is to have been the best not once, but across a whole season."

player_of_season:
"Some seasons, one player stands apart. Not merely the top scorer or the finest creator, but the man who
bent the whole campaign to his will, week after week, until his name was the only answer. This is the
honour his peers and the watching game give to that season's defining figure."

golden_boot:
"There is a purity to the Golden Boot. Not the most complete player, not the prettiest to watch, simply
the one who did the thing everyone came to see, more than anyone else. To lead a league in goals across a
whole season is to answer the same question every week, and never once flinch."

top_assists:
"The best assists are acts of generosity. To lead a league in them is to have seen the pass others missed,
again and again, to have made teammates better and asked for none of the glory. The top creator is the
player the goalscorers should thank first."

## #17 — Wonder Tags grouped sections (with names)
Group the Wonder Tags expand into labelled sections. Proposed names (clean, on-brand):

1. "SILVERWARE"        — team honours: World Cup, League Champion, UCL  (what the team won)
   (alt names: "TROPHIES", "TEAM HONOURS", "WHAT THEY WON")
2. "INDIVIDUAL HONOURS" — personal accolades: Ballon d'Or, POTS, Golden Boot, Top Assists
   (alt: "PERSONAL HONOURS", "THE INDIVIDUAL")
3. "THE PLAYER"         — profile/game-style tags: Goal Machine, Provider, Regista, etc.
   (alt: "GAME STYLE", "HOW THEY PLAY", "STYLE OF PLAY")

RECOMMENDED SET (Winter-clean, distinct):
- "SILVERWARE"  (team honours — collective, tangible)
- "INDIVIDUAL HONOURS"  (personal accolades)
- "THE PLAYER"  (profile tags — how they play)

Order on the card: SILVERWARE → INDIVIDUAL HONOURS → THE PLAYER (achievement before characterization,
matching the honours-lead principle). Each section only renders when it has content (no empty headers).
Small Winter-style section labels + hairline dividers (like the honours strip's gold hairline).

Note: this maps to HONOUR_META.group (Team/Individual/Career) + the profile tag families. World Cup is
"Career" in HONOUR_META but belongs under SILVERWARE (it's a team trophy). Adjust grouping: Team + Career
world_cup → SILVERWARE; Individual → INDIVIDUAL HONOURS; profile tags → THE PLAYER.
