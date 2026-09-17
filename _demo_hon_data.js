/*  ONE SOURCE FOR ALL THREE HONOURS DEMOS, so the copy cannot drift between them.
    Names, one-liners, definitions and quotes are lifted verbatim from playbook.html's
    HON_COPY and vv-core's HONOUR_ONELINER. Nothing rewritten.
    `leg` is vv-core's axis (which cards it attaches to). `rare` is a STRUCTURAL statement
    about the competition, never a row count: the honours table stores team honours once per
    winning TEAM and individual honours once per PLAYER, so counting rows sorts them wrongly,
    and a count would go stale on every ingest besides.  */
window.HON = [
 {k:'ballon_dor', n:"Ballon d'Or", leg:'player', rank:1,
  one:'The best player in the world that season.',
  rare:'One player, once a year, in the world.',
  td:"Named the <b>single best player in the world</b> that year. Football's most prestigious individual prize.",
  dq:"“The highest honour the game can bestow on one man. Not a team's triumph, but a singular coronation, the season the whole of football looked up and agreed: above all others, this one.”"},
 {k:'world_cup_winner', n:'World Cup Winner', leg:'career', rank:2,
  one:'A world champion. The prize every player covets most.',
  rare:'One squad, once every four years.',
  td:"A world champion. The prize every player covets most. It is the one honour that sits on <b>every season of a winner's career</b>, not just the tournament year, so a card prints the year it was won.",
  dq:"“Every four years a nation holds its breath, and for one squad it ends in glory. The World Cup is the prize a career is measured against, the one that turns a great player into an immortal. Some of the finest never lift it. Those who do are never forgotten.”"},
 {k:'player_of_season', n:'Player of the Season', leg:'player', rank:3,
  one:'The league’s finest over a full campaign.',
  rare:'One player in each league, every season.',
  td:"Voted the <b>standout individual</b> of the entire campaign.",
  dq:"“When the votes were counted, one name stood above the rest. Across ten long months, no one shone brighter.”"},
 {k:'golden_boot', n:'Golden Boot', leg:'player', rank:4,
  one:'The league’s top scorer. Nobody scored more.',
  rare:'One player in each league, every season.',
  td:"Led the league for <b>goals</b> that season. The sharpest shooter of them all.",
  dq:"“Goal after goal after goal, until the boot itself turned to gold. The oldest honour in the game, earned the only way it can be.”"},
 {k:'top_assists', n:'Top Assists', leg:'player', rank:5,
  one:'The league’s chief creator. Nobody made more.',
  rare:'One player in each league, every season.',
  td:"Led the league for <b>assists</b> that season. The supreme provider.",
  dq:"“He did not always take the glory. He made it, time and again, with the pass that mattered.”"},
 {k:'ucl_winner', n:'UCL Winner', leg:'team', rank:6,
  one:'Champion of Europe, the club game’s greatest prize.',
  rare:'One squad in Europe, every season.',
  td:"Lifted the <b>Champions League</b>, the grandest prize in club football.",
  dq:"“Under the brightest lights, on the grandest stage. He did not shrink. He rose.”"},
 {k:'league_champion', n:'League Champion', leg:'team', rank:7,
  one:'Champions. Top of the league across a full season.',
  rare:'One squad in each of nine leagues, every season.',
  td:"A <b>champion</b>. Part of the team that won the league that season.",
  dq:"“In the end, the only number that never fades: champions. Form is temporary. This is forever.”"}
];
window.honMark=function(k){ return (window.VVMarks&&VVMarks.honour)?VVMarks.honour(k):''; };
