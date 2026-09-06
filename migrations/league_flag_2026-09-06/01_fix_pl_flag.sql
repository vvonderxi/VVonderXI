--  THE PREMIER LEAGUE'S flag_emoji WAS A BARE U+1F3F4, WHICH RENDERS AS A PLAIN BLACK FLAG.
--  Every other league in the table holds a correct two-codepoint regional-indicator pair.
--  England is not a country with an ISO 3166-1 code, so it needs the seven-codepoint
--  subdivision tag sequence, which vv-core already carries as TAG_FLAGS._ENG and uses for
--  player nationality. This aligns the database with the sequence the front end already ships.
--
--  WRITTEN WITH chr(), NOT A PASTED LITERAL, ON PURPOSE. Tag-sequence codepoints are
--  invisible: they carry no glyph of their own, so a literal cannot be eyeballed, cannot be
--  diffed by a human, and is silently destroyed by any tool that normalises or strips
--  unassigned characters in transit. chr() states each codepoint in the open.
--
--    U+1F3F4  waving black flag (the base)
--    U+E0067  tag latin small letter g
--    U+E0062  tag latin small letter b     -> "gb"
--    U+E0065  tag latin small letter e
--    U+E006E  tag latin small letter n
--    U+E0067  tag latin small letter g     -> "eng"
--    U+E007F  cancel tag (terminator)
--
--  SCOPE: display only. flag_emoji is not read by the engine and is not in any percentile,
--  anchor or score path, so no rt can move. That is asserted with a full before/after
--  snapshot rather than assumed.
--
--  A MATVIEW REFRESH IS REQUIRED AFTERWARDS. player_card_view surfaces this as
--  l.flag_emoji AS league_flag, so player_card_mv holds a frozen copy until refreshed.
--  Note the refresh now also rebuilds three GIN trigram indexes and is slower than it was
--  before 2026-08-29; that is expected, not a fault.

UPDATE leagues
   SET flag_emoji = chr(127988) || chr(917607) || chr(917602)
                 || chr(917605) || chr(917614) || chr(917607) || chr(917631)
 WHERE code = 'PL'
   AND country = 'England'
   AND length(flag_emoji) = 1;
