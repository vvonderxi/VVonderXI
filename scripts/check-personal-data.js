#!/usr/bin/env node
/*  REFUSE A COMMIT THAT CARRIES SOMEBODY ELSE'S PERSONAL DATA , 2026-10-03.
    ================================================================================
    WHY THIS EXISTS. On 2026-10-03 a rollback capture, `waitlist_before.json`, was
    committed with five real email addresses in it , four of them other people's.
    It was made for a good reason (capture before you write) and committed without
    anyone asking what a capture of a signup table contains. Removing it meant a
    history rewrite and a force push.

    THE SHAPE OF THE MISTAKE IS THE REUSABLE PART: capture files are made in a hurry,
    at the moment of a migration, by someone concentrating on the migration. They are
    exactly the files nobody reads before committing. So the check belongs at the
    commit, not in a rule somebody has to remember , CLAUDE.md's own standing lesson
    that a rule depending on memory is a rule already forgotten.

    WHAT IT LOOKS FOR, and deliberately not more:
      * email addresses at real consumer domains , the thing that actually happened
      * anything that looks like a live secret (sb_secret_, sk-ant-, service_role JWT)
    IT DOES NOT try to detect names, IPs or arbitrary PII. A check that flags
    everything gets silenced, and CLAUDE.md records that a guard crying on a quarter
    of a clean run is worse than no guard.

    WHAT IT DELIBERATELY ALLOWS:
      * example.com / example.invalid / .test , reserved by RFC 2606 for exactly this
      * the three documentation files that discuss the ORIGINAL 2026-08-01 leak and
        quote one address while doing so. They are notes ABOUT the problem, and
        failing them would teach everyone to pass --no-verify.

    RUN   node scripts/check-personal-data.js            , staged files (pre-commit)
          node scripts/check-personal-data.js --all      , every tracked file
    EXIT  0 clean, 1 if something would be committed that should not be.
*/
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

const ALL = process.argv.includes('--all');

/*  The three files that discuss the original leak. Allowed BY PATH and only for the
    email rule , a secret in one of them would still fail. If a fourth file ever
    needs to be here, that is a sign the convention has drifted, not that the list
    is too short.  */
const DISCUSS_THE_LEAK = new Set(['CLAUDE_ARCHIVE.md', 'LAUNCH_STAGE.md', 'QA_PASS.md']);

const RESERVED = /@(example\.(com|org|net|invalid)|test|localhost|invalid)\b/i;
const EMAIL = /\b[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|proton|gmx|live|aol)\.[a-z.]{2,}/gi;
const SECRET = /\b(sb_secret_[A-Za-z0-9_-]{10,}|sk-ant-[A-Za-z0-9_-]{10,})\b/g;
/*  A PLACEHOLDER IS NOT A SECRET, AND THE FIRST RUN OF THIS CHECK FAILED ON ONE.
    `.env.example` carries `sk-ant-your-api-key-here`, which matches the shape exactly.
    CLAUDE.md records that a guard crying on a clean run is worse than no guard, because
    the next person silences it , so the clean state has to actually be clean. These are
    the words a placeholder uses and a key never does.  */
const PLACEHOLDER = /(your|example|placeholder|here|xxx+|\.\.\.|<|changeme|replace)/i;

const files = ALL
  ? execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
  : execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
      .split('\n').filter(Boolean);

let bad = 0;
for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }   // binary or gone
  if (text.includes('\u0000')) continue;

  const secrets = (text.match(SECRET) || []).filter(x => !PLACEHOLDER.test(x));
  for (const s of secrets) {
    console.log(`  SECRET   ${f}  ${s.slice(0, 12)}…`);
    bad++;
  }

  if (DISCUSS_THE_LEAK.has(f)) continue;
  const hits = (text.match(EMAIL) || []).filter(e => !RESERVED.test(e));
  if (hits.length) {
    /*  Report the COUNT and a masked sample, never the addresses , a check that
        prints the data it is protecting has published it to every terminal and CI
        log that runs it.  */
    const sample = hits.slice(0, 3).map(e => e.replace(/^(.{2})[^@]*/, '$1***'));
    console.log(`  EMAILS   ${f}  ${hits.length} address(es)   e.g. ${sample.join(', ')}`);
    bad++;
  }
}

if (bad) {
  console.log(`\n${bad} file(s) carry personal data or a secret and must not be committed.`);
  console.log('A capture of a user table is the usual cause. Either leave it out of git,');
  console.log('or strip the column before writing it , the capture is for row counts and');
  console.log('ids, not for the addresses themselves.');
  process.exit(1);
}
console.log(`  ok   ${files.length} file(s) checked, no personal data or secrets`);

/*  CONTROL , a check whose failing state has never been seen is not evidence.
    Planted and observed on 2026-10-03:
      a gmail address in a scratch file   -> EMAILS, exit 1
      an sb_secret_ string in a .md       -> SECRET, exit 1
      `sk-ant-your-api-key-here`          -> PASSES. It is .env.example's placeholder,
                                             and the check's first run failed on it.
      the same address at example.com     -> passes, as RFC 2606 intends
      QA_PASS.md unchanged                -> passes, by the allowance above
    Clean run over --all prints one ok line and exits 0 (919 files).

    AND THE CONTROLS HAVE TO BE STAGED, WHICH THE FIRST ATTEMPT GOT WRONG. Running them
    against `--all` reported exit 0 for every planted fault, because `--all` reads
    `git ls-files` and an untracked probe file is not in it , so the checks were passing
    over a file they never opened. `git add` the probe and run the DEFAULT (staged) mode.
    CLAUDE.md's rule, hit again: a check whose failing state has not been OBSERVED is
    indistinguishable from one that cannot see anything.  */
