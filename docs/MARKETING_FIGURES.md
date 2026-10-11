# FIGURES THAT LEAVE THE PLATFORM , A LEDGER, STARTED 2026-10-08

> **BEFORE ANY CREATIVE WITH A PLAYER'S FACE (added 2026-10-11).** A named player's current
> face in a PAID advert is a different case from the same face on our own site: an advert
> can read as the player endorsing the product. The provider's image terms (API-Football,
> where every card photo comes from) have never been checked, and neither has the player's
> or club's image rights. Clear both before a paid ad with a face goes out. The photos are
> also current headshots, not from the season on the card. Full note: `BRAND_BRIEF.md`
> section 11.

A number drawn into an image is a snapshot with no check. `data-fig` spans, `apply-figures`
and `check-card-image.js` all read the repository; a PNG rendered elsewhere and posted to a
timeline is reachable by none of them, and unlike the four embedded snapshots in `CLAUDE.md`
it cannot be regenerated after the fact , it has already been seen. So every such figure is
recorded here with the query that produced it, and re-run before the asset is published.

**THE CHECK, ONE LINE PER ROW:** `node -e` against `player_card_mv` by `card_id`, compare `rt`
to the value drawn. If they differ, the asset is re-rendered, not the ledger edited.

| asset | card_id | player, club, season | figure drawn | rt measured | measured on | status |
|---|---|---|---|---|---|---|
| pinned launch post, card front | 138409 | R. Lewandowski, Barcelona, 2022/23 (LL, ST, 23G 7A, 2,851 min) | 89 | **89** | 2026-10-08 | CONFIRMED, the placeholder happened to be right |

**WHAT 89 IS, SO THE CAPTION CANNOT OVERCLAIM:** engine band World Class, which the public ladder
shows as World Class (85 to 89). It is his FIRST Barcelona season and his lowest of the previous
eight: Bayern 2015/16 to 2021/22 run 91, 91, 90, 89, 91, 92, 91. If the post names a band, it is
World Class, not Iconic.

**RE-RUN BEFORE PUBLISHING.** The matview is refreshed after every data sitting and a score can
move by a point without anyone announcing it (the 2026-09-26 split moved 181 cards). The figure
above is true today and this file is not a generator.

## The four homepage pairs, squad numbers and club colours for ad creative (measured 2026-10-11)

Read from `player_card_mv` and rendered through `VVCore.buildCard`, so the shield column is what the
card face DRAWS, not only what is stored. The card splits the shield only when the second colour is
genuine and darker than near-white (`shieldSplit`); a white or missing second colour gives a SOLID
shield in the first colour, with the number ink chosen for contrast (`inkFor`). A split shield prints
the number white with a black outline.

| card_id | player, club, season | rt | number | shirt_number_source | shield as drawn | number ink | stored primary / secondary | status |
|---|---|---|---|---|---|---|---|---|
| 143372 | L. Messi, Barcelona, 2011/12 | 97 | 10 | modal_single | split #A50044 / #004D98 | #FFFFFF, black outline | #A50044 / #004D98 | OBSERVED, not inferred |
| 141999 | Cristiano Ronaldo, Real Madrid, 2014/15 | 96 | 7 | modal_single | solid #FFFFFF | #1C1B1A | #FFFFFF / (none) | OBSERVED, not inferred |
| 131585 | E. Haaland, Manchester City, 2022/23 | 95 | 9 | modal_single | solid #6CABDD | #1C1B1A | #6CABDD / #FFFFFF | OBSERVED, not inferred |
| 135556 | L. Suárez, Liverpool, 2013/14 | 94 | 7 | modal_single | solid #C8102E | #FFFFFF | #C8102E / #FFFFFF | OBSERVED, not inferred |
| 152972 | R. Lewandowski, Bayern München, 2020/21 | 92 | 9 | modal_single | solid #DC052D | #FFFFFF | #DC052D / #FFFFFF | OBSERVED, not inferred |
| 151977 | H. Kane, Bayern München, 2023/24 | 92 | 9 | modal_single | solid #DC052D | #FFFFFF | #DC052D / #FFFFFF | OBSERVED, not inferred |
| 130728 | Mohamed Salah, Liverpool, 2024/25 | 95 | 11 | modal_single | solid #C8102E | #FFFFFF | #C8102E / #FFFFFF | OBSERVED, not inferred |
| 158399 | Kylian Mbappé, Paris Saint Germain, 2021/22 | 92 | 7 | modal_single | split #004170 / #DA291C | #FFFFFF, black outline | #004170 / #DA291C | OBSERVED, not inferred |

**WHAT THE SOURCE MEANS, SO NOBODY OVERSTATES IT.** `modal_single` is the number the player wore most
often in that club's starting line-ups that season, from the data provider's team sheets, on a season
spent at one club. It is not `modal_split` (the platform's only INFERRED value, a mid-season move where
the number may be either club's), and none of the eight is. It is also not `squadnum`, which is read
off the club's squad table: the platform labels that "Sourced" and this "One club that season". All
eight are fine to print as the number he wore; none of them is a verified squad-list entry.

**THE DARK INK ON MAN CITY IS CORRECT, CHECKED 2026-10-11 RATHER THAN ASSUMED.** The stored and drawn
fill is sky blue #6CABDD (the card's luma 0.62, light), so `inkFor` picks the dark #1C1B1A: contrast
6.97 against the fill, where white would be 2.47. The other solid shields are deep colours and take
white: Liverpool #C8102E at 5.88, Bayern #DC052D at 5.12. PSG's primary is #004170, the same navy as
the left half of Mbappé's split shield.

**FOR THE CREATIVE: Real Madrid has one stored colour (white).** The card draws a solid white shield
with a dark number, so on a light background it needs an edge. Five of the eight shields are solid
because the stored second colour is white; the card does not draw that white half.

**RE-RUN BEFORE PUBLISHING, one command, Terminal A:**
`node -e "require('dotenv').config();const{createClient}=require('@supabase/supabase-js');createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY).from('player_card_mv').select('card_id,rt,shirt_number,shirt_number_source,primary_colour,secondary_colour').in('card_id',[143372,141999,131585,135556,152972,151977,130728,158399]).then(r=>console.table(r.data))"`
If any value differs from the table, the asset is re-rendered, not this file edited.

## Card images for creative: use the export, not a re-drawing (2026-10-11)

`node scripts/card-export.js <card_id> <width_px>` writes `_local/cards/card-<id>-<width>.png`, a
transparent PNG of the card from the shipping card page, in the installed Chrome, with the real
database row. It is not a third renderer, so it cannot drift from the product; the Python renderer
can be retired.

**IT IS THE CARD PAGE'S CARD, SPECIFICALLY.** The card's outer frame is styled in each page, and the
six page-level copies differ by a hairline. An export is card.html's hero card. Do not present it as
the rankings or Compare card.

**THREE THINGS TO KNOW BEFORE PRINTING ONE:**
- **The photo is the player's current headshot, not one from that season.** Mbappé's 2021/22 PSG card
  shows him in a Real Madrid shirt. The site shows the same; the export is faithful to it.
- **The corners carry the card's own drop shadow,** at most 9% opacity. It is part of the card on the
  page, and the same style property draws the rim, so it stays.
- **Every figure on the card is live.** Re-export after any data change rather than reusing an old PNG,
  and log the figures here as for any other asset.
