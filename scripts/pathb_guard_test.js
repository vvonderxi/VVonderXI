/*  THE PATH B WINNER GUARD, EXERCISED WITHOUT A KEY OR A NETWORK CALL , 2026-09-11.
 *
 *  Under Path B the MODEL decides which of two seasons is the better one, for pairs the VV
 *  Score cannot separate. A model-supplied answer is untrusted input, and the only thing
 *  standing between it and a row in verdict_cache is api/analyse.js's resolveWinnerId.
 *  That function is pure and exported precisely so it can be tested here: a guard that is
 *  only ever exercised by generating a verdict is a guard nobody checks.
 *
 *  WHAT IT MUST DO, in one line each:
 *    - accept "A" / "B" and NOTHING else from the model (a raw card id included, even a
 *      correct one , the model is not allowed to supply ids at all)
 *    - resolve that letter against the ids THIS REQUEST carried, never against model text
 *    - reject any id that is not one of the two in the pair
 *    - treat a decline, a missing field and a failed check identically: null, which is the
 *      safe state , no crown, no winner_card_id, the pairing reads as unresolved
 *    - on the ENGINE path (a pair the Index DID separate) ignore the model entirely, because
 *      the score line is rendered beneath the verdict and a crown on the lower number would
 *      contradict the page
 *
 *  Run:  node scripts/pathb_guard_test.js        (exit 0 = all pass)
 */
const { resolveWinnerId: R } = require(require('path').join(__dirname, '..', 'api', 'analyse.js'));
if (typeof R !== 'function') {
  console.error('FATAL: api/analyse.js does not export resolveWinnerId. Refusing to report a pass on a guard that is not there.');
  process.exit(2);
}

const A = 130524, B = 131533;          // Bruno 25/26, Odegaard 22/23 , a real Path B pairing
const OTHER = 143372;                  // a real card id that is NOT in this pair

const CASES = [
  // PATH B , the model decides
  ['ai  | model returns "A"',                    { aiJudge:true, modelWinner:'A' },                    A],
  ['ai  | model returns " b " (case + spaces)',  { aiJudge:true, modelWinner:' b ' },                  B],
  ['ai  | model declines with null',             { aiJudge:true, modelWinner:null },                   null],
  ['ai  | model omits the field',                { aiJudge:true },                                     null],
  ['ai  | model returns "C"',                    { aiJudge:true, modelWinner:'C' },                    null],
  ['ai  | model returns a player name',          { aiJudge:true, modelWinner:'Bruno Fernandes' },      null],
  ['ai  | model returns a card id IN the pair',  { aiJudge:true, modelWinner:String(A) },              null],
  ['ai  | model returns a card id outside it',   { aiJudge:true, modelWinner:String(OTHER) },          null],
  ['ai  | model returns a number',               { aiJudge:true, modelWinner:A },                      null],
  ['ai  | caller winner is ignored',             { aiJudge:true, modelWinner:null, winnerCardId:A },   null],
  // ENGINE , the caller decides, the model cannot overturn it
  ['eng | caller sends A, model says B',         { aiJudge:false, modelWinner:'B', winnerCardId:A },   A],
  ['eng | caller sends null, model says A',      { aiJudge:false, modelWinner:'A', winnerCardId:null },null],
  ['eng | caller sends an id outside the pair',  { aiJudge:false, winnerCardId:OTHER },                null],
  ['eng | caller sends garbage',                 { aiJudge:false, winnerCardId:'x' },                  null],
  ['eng | caller sends a numeric string',        { aiJudge:false, winnerCardId:String(B) },            B],
];

let bad = 0;
for (const [label, args, want] of CASES) {
  const got = R(Object.assign({ idA: A, idB: B }, args));
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label.padEnd(44) + ' -> ' + JSON.stringify(got) + (ok ? '' : '   (want ' + JSON.stringify(want) + ')'));
}
console.log(bad ? '\n  ' + bad + ' of ' + CASES.length + ' FAILED\n' : '\n  all ' + CASES.length + ' pass\n');
process.exit(bad ? 1 : 0);
