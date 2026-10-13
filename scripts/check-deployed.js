#!/usr/bin/env node
/*  IS WHAT I PUSHED WHAT THE SITE SERVES? (2026-10-13). Read-only: it fetches public files and
 *  compares bytes. It never deploys, never writes.
 *
 *    node scripts/check-deployed.js                 wait up to 4 minutes for vvonderxi.com to match HEAD
 *    node scripts/check-deployed.js --now           one look, no waiting
 *    VV_BASE=https://<preview> node scripts/check-deployed.js   any other deployment
 *
 *  RUN IT AFTER EVERY PUSH, in Terminal C, straight after `git push`.
 *
 *  WHY. On 2026-10-13 two pushes went nowhere. The Vercel GitHub app had been narrowed to one
 *  other repository, so this one stopped receiving push events: no build, no failed build, no
 *  email, nothing. GitHub showed the commits, `git push` said ok, and the site went on serving
 *  the day before. It was found only because a button that had been fixed was still dead.
 *  Every check on the platform tested the LOCAL tree, so every one of them passed.
 *
 *  WHAT IT DOES. Takes the list of files Vercel is allowed to publish from `.vercelignore` (an
 *  allowlist, so the list is the deploy surface by construction) plus every tracked file under
 *  assets/ and fonts/, fetches each from the live site with a cache-buster, and compares its
 *  bytes with the same file at HEAD. Exits 1, naming every file that differs, if they have not
 *  converged when the wait runs out. While it waits it also asks GitHub whether Vercel has even
 *  SEEN the commit (the cheap signal, see below), so a push Vercel never received is named as
 *  that rather than as a slow build.
 *
 *  THE CHEAPER SIGNAL, AND WHY IT IS NOT ENOUGH ON ITS OWN. Vercel posts a commit status to
 *  GitHub within seconds of receiving a push ("Vercel , v-vonder-xi"). No status after a minute
 *  means the push never reached Vercel, which is exactly the 2026-10-13 failure, and it costs one
 *  API call. But a status says a BUILD happened, not that the domain serves it: a build can go to
 *  Preview, a production branch setting can point elsewhere (SS C: it pointed at `coming-soon`
 *  for a month), or the CDN can hold an old copy. Only the bytes settle what a visitor gets, so
 *  the status is the early diagnosis and the byte comparison is the verdict.
 *
 *  WHAT IT CANNOT SEE: the serverless function (api/analyse.js runs on Vercel and is not served
 *  as a file), environment variables, and Vercel settings. A match means the static site is HEAD.
 *
 *  CONTROL, MEASURED 2026-10-13: pointed at yesterday's production build
 *  (VV_BASE=https://v-vonder-phx18x6dg-lucsa-vanlauwe-s-projects.vercel.app) with HEAD c96cc77 it
 *  FAILS, exit 1, naming exactly the nine deployed files `git diff --name-only b221ea1 c96cc77`
 *  lists and nothing else; against vvonderxi.com it passes, 45 of 45 identical. The GitHub branch
 *  was exercised on a commit not yet pushed: it reports no Vercel status.
 */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const BASE = (process.env.VV_BASE || 'https://vvonderxi.com').replace(/\/$/, '');
const WAIT_MS = process.argv.includes('--now') ? 0 : 4 * 60 * 1000;
const git = (...a) => execFileSync('git', a, { encoding: 'buffer', maxBuffer: 64 << 20 });
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const HEAD = git('rev-parse', 'HEAD').toString().trim();
const ign = git('show', 'HEAD:.vercelignore').toString().split('\n').map(l => l.trim());
const NOT_SERVED = new Set(['vercel.json', 'package.json', 'package-lock.json']);
const top = ign.filter(l => /^!\/[^/]+\.[a-z0-9]+$/i.test(l)).map(l => l.slice(2)).filter(f => !NOT_SERVED.has(f));
const dirs = ign.filter(l => /^!\/(assets|fonts)$/.test(l)).map(l => l.slice(2));
const nested = dirs.length ? git('ls-tree', '-r', '--name-only', 'HEAD', '--', ...dirs).toString().split('\n').filter(Boolean) : [];
const FILES = [...top, ...nested];
if (FILES.length < 20) { console.error(`only ${FILES.length} files read from .vercelignore , the parser no longer matches the file; fix it before trusting a pass`); process.exit(2); }

async function compare() {
  const diff = [];
  await Promise.all(FILES.map(async f => {
    let want; try { want = git('show', `HEAD:${f}`); } catch (e) { diff.push(`${f}: not in HEAD`); return; }
    const r = await fetch(`${BASE}/${encodeURI(f)}?vvcheck=${Date.now()}`, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
    if (!r.ok) { diff.push(`${f}: HTTP ${r.status}`); return; }
    const got = Buffer.from(await r.arrayBuffer());
    if (!got.equals(want)) diff.push(`${f}: live ${sha(got)} (${got.length} B) , HEAD ${sha(want)} (${want.length} B)`);
  }));
  return diff.sort();
}

// The cheap signal: has Vercel posted anything on this commit? Needs `gh`; skipped quietly if absent.
function vercelSaw() {
  try {
    const repo = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { encoding: 'utf8' }).trim();
    const out = execFileSync('gh', ['api', `repos/${repo}/commits/${HEAD}/status`, '-q', '.statuses[]|.context+" "+.state'], { encoding: 'utf8' }).trim();
    const v = out.split('\n').filter(l => /vercel|production|preview/i.test(l));
    return v.length ? v.join(' | ') : 'NO Vercel status on this commit: Vercel has not received the push';
  } catch (e) { return null; }
}

(async () => {
  let upstream = '';
  try { upstream = git('rev-parse', 'origin/vvonderxi_BIGGER').toString().trim(); } catch (e) {}
  console.log(`HEAD ${HEAD.slice(0, 7)} against ${BASE}, ${FILES.length} files`);
  if (upstream && upstream !== HEAD) console.log(`  note: origin/vvonderxi_BIGGER is ${upstream.slice(0, 7)} (as of your last fetch), not HEAD , has HEAD been pushed to the production branch?`);
  const t0 = Date.now(); let diff, saw = null, shown = false;
  for (;;) {
    diff = await compare();
    if (!diff.length) break;
    const el = Date.now() - t0;
    if (el >= 60000 && !shown) { saw = vercelSaw(); if (saw) console.log(`  GitHub after ${Math.round(el / 1000)}s: ${saw}`); shown = true; }
    if (el >= WAIT_MS) break;
    process.stdout.write(`  ${diff.length} file(s) differ, waiting (${Math.round(el / 1000)}s)\n`);
    await sleep(15000);
  }
  if (!diff.length) { console.log(`\nOK , ${BASE} serves HEAD ${HEAD.slice(0, 7)}: all ${FILES.length} files byte-identical.`); return; }
  if (!shown) { saw = vercelSaw(); if (saw) console.log(`  GitHub: ${saw}`); }
  console.log(`\nFAIL , ${BASE} is NOT serving HEAD ${HEAD.slice(0, 7)}. ${diff.length} file(s) differ:`);
  diff.forEach(l => console.log('  ' + l));
  console.log('\nThe push has not reached visitors. Check the Vercel dashboard for this project before testing anything on the live site.');
  process.exit(1);
})().catch(e => { console.error('check-deployed failed:', e.message); process.exit(2); });
