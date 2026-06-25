# atmot-bot

Daily Bluesky bot for [AT Mot](https://atmot.herve.bzh). Posts once per language
each day just after the UTC puzzle rollover: invites players to today's puzzle and
congratulates yesterday's solvers (by count only).

Runs as a stateless Cloudflare Worker with two Cron Triggers (EN 00:10 UTC, FR
00:11 UTC). Counts are read from the public Constellation backlink index; there is
no database. The bot duplicates a small set of the app's frozen constants
(`src/config.ts`) rather than importing the app.

## Develop

```sh
npm install
npm test          # vitest — composer + facets + puzzle math
npm run typecheck
npm run dev       # wrangler dev --test-scheduled (see Dry run below)
```

## Dry run (no real post)

Create a gitignored `.dev.vars`:

```
DRY_RUN = "1"
ATMOT_BOT_IDENTIFIER = "atmot.herve.bzh"
ATMOT_BOT_APP_PASSWORD = "dry-run-unused"
```

Then `npm run dev` and, in another shell:

```sh
curl "http://localhost:8787/__scheduled?cron=10+0+*+*+*"   # EN
curl "http://localhost:8787/__scheduled?cron=11+0+*+*+*"   # FR
```

The composed post is logged instead of published.

## Deploy

The bot posts as **@atmot.herve.bzh** using a Bluesky **app password** (Settings →
Privacy and security → App passwords — not the account password).

```sh
npx wrangler login
npx wrangler secret put ATMOT_BOT_IDENTIFIER     # e.g. atmot.herve.bzh
npx wrangler secret put ATMOT_BOT_APP_PASSWORD   # the app password
npm run deploy
```

The free Workers plan is sufficient: each language runs in its own scheduled
invocation, so each gets the full 50-subrequest budget. Solver counting samples up
to `SOLVER_SAMPLE_CAP` (20) records per language; beyond that the count is hedged
(e.g. "20+").

Each sampled record costs ~2 subrequests (DID-document resolution + the record
read), so the default cap of 20 already uses most of the per-invocation budget on
the free plan — keep headroom for the count, session, idempotency check, and
publish (~6 more). On the paid plan you can raise `SOLVER_SAMPLE_CAP` in
`src/config.ts`, but size it against the subrequest cost (~2 per record), not just
the desired sample size.
