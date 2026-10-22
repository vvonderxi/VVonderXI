PROJECT: VVonderXI. A football-season ranking and comparison site: every player-season in nine European leagues since 2010/11, scored out of 100, with head-to-head comparisons. Stage: **live** (vvonderxi.com since 2026-10-08), with AI prose switched off since 2026-10-17. Users today:
- **No accounts.** Sign-in isn't built.
- **5 waitlist signups,** the newest 2026-09-06. There have been zero since launch, across what you report as 273 paid clicks.
- **Tracked actions 2026-10-09 to 2026-10-22, my test rows excluded:** 61 card opens, 42 comparisons, 14 searches with no result.
- **Unique visitors:** CONFIRM IN DASHBOARD: Vercel → project → Analytics.

ARCHITECTURE: The front end is hand-written static HTML: one file per page, two shared scripts, no framework and no build step. Vercel serves it along with exactly one serverless function, `api/analyse.js`, which calls Anthropic to write Compare verdicts and card notes. That function is off-switched by an environment setting, and while it's off nothing is generated or billed. The pages read player data straight from Supabase (Postgres) with a public read-only key, mostly from one precomputed table of 58,066 player-seasons. Player data was imported by local Node scripts from API-Football; nothing imports on a schedule. Email for the domain goes through Resend (sending, verified but unused) and ImprovMX (inbound forwarding).
- **Frontend:** static HTML/CSS/JS on Vercel (Pro team, shared with the-vault). Supabase's JS client loads from the jsDelivr CDN.
- **Backend:** one Vercel serverless function (`api/analyse.js`, Fluid Compute), with an origin allowlist and a rate limit of 30 new generations per hour per IP, 2 at a time, plus a global hourly ceiling.
- **Database:** Supabase Postgres, one project; on the Pro plan since 2026-10-09, after a 40-minute outage on the free tier.
- **Auth:** Supabase Auth with Email and Google configured, but **unused**: there is no sign-in on any page.
- **AI:** Anthropic API. claude-sonnet-4-6 writes; claude-haiku-4-5 is the checker, built but switched off.
- **Email:**
  - Resend: domain verified; the launch email has not been sent by any session here.
  - ImprovMX: free inbound forwarding for hello@ and dmarc@.
- **Payments:** none.
- **Monitoring:** none dedicated. Vercel runtime logs (1 day on Pro), Vercel Web Analytics, our own `vv_events` table and the rate ledger. Nothing watches the Anthropic balance.
- **Storage:** no object storage. Player photos are hot-linked from API-Football's media CDN; static images ship in the repo.
- **Data sources:**
  - API-Football: bulk player and lineup imports, run by hand.
  - Wikipedia and Wikidata: squad numbers and honours, free.
  - Sportmonks: a token sits in `.env` from a parked evaluation.
- **Scheduled jobs:** one hourly `pg_cron` job in Supabase deleting old rows, as the privacy policy promises. Nothing else.

SERVICES TABLE:

| Service | What it's used for | Plan / tier | Fixed cost per month | Usage-based cost (last 30 days, and the driver) | Billed to | Can it be shared with other projects? |
|---|---|---|---|---|---|---|
| Vercel | Hosting, the one serverless function, Web Analytics | Pro team | CONFIRM IN DASHBOARD: Vercel → Team Settings → Billing (team bill was $23.49 for the Oct cycle) | **$1.91 of that bill was this project** (Oct cycle, your figure), mostly function time and analytics | CONFIRM IN DASHBOARD: Vercel → Billing → Payment method | **Already shared**: the rest of the bill is mostly the-vault |
| Supabase | Database, the public read API, unused Auth, pg_cron | Pro since 2026-10-09 | CONFIRM IN DASHBOARD: Supabase → Organization → Billing (Pro base plus project compute) | CONFIRM IN DASHBOARD: Supabase → Billing → Usage. The drivers are compute size, database size and egress from the public API reads | CONFIRM IN DASHBOARD: Supabase → Billing | **Yes.** The plan is per organization; other projects in the same org share it, each adding compute |
| Anthropic API | Compare verdicts and card notes (Sonnet 4.6); checker (Haiku 4.5, off) | Pay as you go, prepaid balance, auto-reload **off** (balance was $32.94 on 2026-09-27) | $0 | **Roughly $10 to $20, an estimate**: the 10-03 pre-warm of about $9.25, plus organic generations up to 10-17. **0 since 10-17**, prose off. CONFIRM IN DASHBOARD: console.anthropic.com → Usage, filtered by this project's key | CONFIRM IN DASHBOARD: Anthropic console → Billing | **Yes** (one org, many keys); keep a separate key per project so spend can be read apart |
| Claude Code | The coding sessions that build the site | CONFIRM IN DASHBOARD: claude.ai → Settings → Billing (or Console, if billed via the API) | CONFIRM | CONFIRM | CONFIRM | **Yes**, it's per person, not per project |
| API-Football (api-sports.io) | Player-season and lineup imports, run by hand from local scripts | CONFIRM IN DASHBOARD: dashboard.api-football.com → Subscription | CONFIRM. The 2026-10-09 lineup pull made about 32,000 calls, which a free tier would not allow | Nothing since the 10-09 pull; it's only used when an import runs | CONFIRM | **Yes**, if another project needs football data |
| Sportmonks | Parked evaluation; a token is in `.env` and nothing in the code calls it | CONFIRM IN DASHBOARD: my.sportmonks.com → Subscription | CONFIRM. **If it's paid, it's paying for nothing** | $0 by use | CONFIRM | n/a |
| Resend | Sending from the domain (launch email, planned signup mail) | CONFIRM IN DASHBOARD: resend.com → Settings → Billing (probably free) | CONFIRM, probably $0 | $0: nothing sent from this project that I can see | CONFIRM | **Yes**, one account with several verified domains |
| ImprovMX | Forwards hello@ and dmarc@ to your inbox | Free | $0 | $0 | none | Yes |
| Domain vvonderxi.com | The site's domain | CONFIRM IN DASHBOARD: your registrar → Domains → renewal | CONFIRM (annual renewal ÷ 12) | none | CONFIRM | No (one domain) |
| GitHub | The repository Vercel deploys from | CONFIRM IN DASHBOARD: github.com → Settings → Billing | CONFIRM, probably $0 | none | CONFIRM | Yes |
| jsDelivr | CDN for the Supabase JS client | Free | $0 | $0 | none | Yes |
| Google (OAuth) | Sign-in provider configured in Supabase, unused | Free | $0 | $0 | none | Yes |
| Wikipedia / Wikidata | Squad numbers and honours research | Free | $0 | $0 | none | Yes |

Nothing else in `package.json` (only the Supabase client and dotenv) or in `vercel.json` bills. `.env` holds key names for Supabase, Anthropic, API-Football and Sportmonks, and no others.

AI USAGE DETAIL (last 30 days, 2026-09-22 to 2026-10-22):

**Read this first: the last 30 days are not a normal month.** All model prose has been off since 2026-10-17, so the last 5 days cost $0. The 30 days also include a one-off pre-warm on 10-03 (about $9.25), and a prompt edit on 10-12 that made 725 cached notes stale, which a normal month wouldn't have.

| Feature | Model | Calls, last 30 days | Spend, last 30 days | Caching / batch |
|---|---|---|---|---|
| Compare verdict | claude-sonnet-4-6 | **At least 101** new pairs cached. Regenerations overwrite rows, so the true count is higher, and the ledger keeps only 24 hours. Includes 71 pre-warmed on 10-03. | About $1 pre-warm + roughly $2 to $5 organic. **Estimate.** | Prompt caching **on**: a cache read is a tenth of the price, a write 1.25x, 5-minute life. **No batch processing.** |
| Card notes (glance + scout + notes, one call per card) | claude-sonnet-4-6 | **At least 557** notes created (731 cached in total). Includes 622 pre-warmed on 10-03. | About $8.25 pre-warm + roughly $2 to $5 organic. **Estimate.** | Same: caching on, no batch |
| Verdict checker | claude-haiku-4-5 | **0.** Built and never switched on. | $0 | n/a |
| Pre-warm scripts (local) | claude-sonnet-4-6, direct to Anthropic | Included in the rows above | Included above | Back-to-back runs get cache reads at a tenth of the price; no batch API |

- **What was actually spent:** an estimated $10 to $20. CONFIRM IN DASHBOARD: console.anthropic.com → Usage, by key and date.
- **What a month with prose on would cost at today's traffic:** about **$8 to $12**.
  - Card opens: about 140 a month (61 in 13 days). Every cached note is stale after today's prompt changes, so nearly every open generates, at about $0.043 cold: about $6.
  - Comparisons: about 97 a month (42 in 13 days), at about $0.037 cold and less for repeats of the same pair: about $3 to $4.
  - With the checker on: about $0.003 more per verdict.
- **Two exposures that aren't spend yet but come back with prose:**
  - **Nothing watches the balance, and the hourly ceiling allows about $312 a day.** With auto-reload off, a burst of abuse would empty the balance in hours, and every AI feature would stop until it's topped up. The spend cap and alerts (QA_PASS B4b) aren't set.
  - **The duplicate-generation race:** two simultaneous first requests for one uncached pair both generate. Measured 2026-10-08: two model calls, the second writer wins the cache. It costs one extra generation per collision, which is negligible at today's traffic. It gets fixed or accepted before prose returns.

SCALING (estimates; fixed costs marked CONFIRM above are left out of the AI and hosting figures):

| | Today, prose off | Today's traffic, prose on | 10x traffic, prose on | 100x traffic, prose on |
|---|---|---|---|---|
| Vercel (this project's share) | about $2 | about $2 | about $3 to $5 | about $15 to $40 (function time) |
| Supabase | Pro base + compute, CONFIRM | same | same | likely a larger compute size: **the free tier fell over on one bulk read on 10-09** |
| Anthropic | $0 | about $8 to $12 | about $50 to $90 (more repeat cache hits) | about $400 to $800. Notes are capped by 58k cards (a full warm is about $2,500 once); verdict pairs are not capped. |
| Resend (with the signup webhook built) | $0 | $0 | $0 (free tier) | probably still free; CONFIRM |
| **Total excluding the CONFIRM fixed costs** | **about $2** | **about $10 to $14** | **about $55 to $95** | **about $420 to $850** |

SAVINGS (top 5, without hurting quality):
1. **Cancel Sportmonks if it's a paid plan.** Nothing calls it; the evaluation is parked. Saving: its full fee, CONFIRM. Effort: small.
2. **Pause or downgrade API-Football between import sittings.** It's only used when you run an import by hand; resubscribe for the next sitting. Saving: its monthly fee for every idle month, CONFIRM. Effort: small.
3. **When prose returns, warm known lists through Anthropic's Message Batches API.** Batch pricing is half price, on top of the prompt-cache discount. Warming is the biggest single AI line (the 10-03 warm was about $9). Saving: about half of every warm, roughly $4 to $5 a warm today and more as the list grows. Effort: medium.
4. **Bundle prompt edits.** Every prompt change makes every cached note stale, so every card open regenerates: 725 went stale on 10-12, and today's two changes will do the same. One edit per release instead of several saves a re-warm each time. Saving: roughly $8 to $10 per avoided re-warm at today's size. Effort: small (a working rule, no code).
5. **Put other projects in the same Supabase organization and Vercel team** if they need a database or hosting. Vercel already does this with the-vault. A second Supabase project in the same org pays only its compute, not another plan. Saving: one Pro base fee per project moved, CONFIRM. Effort: medium.

Not on the list because it would hurt quality: moving the writer to a smaller model, or shortening the prompts. Both were measured against reading quality, not cost.

OPEN QUESTIONS (only you can confirm):
1. The fixed monthly costs: Supabase Pro plus compute, the Vercel team plan, API-Football, Sportmonks, the domain renewal, Claude Code, GitHub. Each is marked CONFIRM above with where to look.
2. Is the Sportmonks subscription paid and still active?
3. Actual Anthropic spend for the last 30 days, and the current balance (console → Usage and Billing).
4. Which card each service is billed to.
5. Unique visitors and page views (Vercel Analytics). The 61 card opens and 42 comparisons are our own event counts, not visitors.
6. Was the launch email sent from the Resend dashboard? No session here sent it.
7. **`ANTHROPIC_API_KEY` is currently set in the local `.env`.** The working rule is to set it only for a run and blank it afterwards. Confirm whether it should still be there; I haven't touched it.
8. The spend cap and alerts in the Anthropic console (QA_PASS B4b), before prose comes back on.
