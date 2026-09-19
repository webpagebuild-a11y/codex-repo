# SDET Radar

A personal technology briefing for test automation engineers. A small Node.js 24 app with a responsive dashboard, SQLite storage, official release collection, optional OpenAI ranking, and Resend digests.

## Run locally

```sh
npm ci
npm start
```

Open http://127.0.0.1:3000. No API keys are needed to explore the clearly labeled sample briefing, save preferences, or collect official updates. Samples never enter the database or email pipeline. Node.js 24 or later is required for built-in SQLite; its experimental warning is expected.

## Cloudflare deployment

The cloud app uses Cloudflare Workers, D1, and a minute-based Cron Trigger. It runs independently of a user's computer. `wrangler.jsonc` identifies this repository's deployment; change the account and database IDs before deploying to another account. The free plan has strict per-invocation CPU limits, so collection rotates through one technology every five minutes (about 110 minutes for 22 selected technologies), while delivery is checked every minute during the 8–9 a.m. Eastern retry window. Other configured digest frequencies are also supported. Cloudflare scheduling and email delivery are best-effort; the target time is 8:00 a.m., not an inbox-arrival guarantee.

```sh
npm ci
npm run cloud:build
node cloud-cli.js login
node cloud-cli.js d1 execute sdet-radar --remote --file cloud-schema.sql
node cloud-cli.js deploy
```

Set `APP_TOKEN` (at least 24 characters), `RESEND_API_KEY`, and `DIGEST_EMAIL` as Worker secrets. Keep `ENABLE_SCHEDULER=false` while setting up, then set it to `true` to enable the Cron Trigger. The API fails closed without an access token. Only the three dashboard assets are uploaded publicly; `.env`, local data, and source files are excluded. The access token is entered through the dashboard's unlock form and retained only in that browser tab's session storage.

`node cloud-migrate.js` prepares a one-time local-to-cloud import under the ignored `data/` directory. It does not upload anything by itself. Import `data/cloud-seed.sql` using `d1 execute --remote --file`, then use `secret bulk data/cloud-secrets.json`. These generated files contain private settings and credentials: never commit them. The cloud database stores sent-digest history and uses a database lease plus Resend idempotency to guard against duplicate scheduled sends. An authenticated `/api/health` endpoint exposes the last scheduler invocation and delivery status. `/api/test-email` sends a clearly labeled connection test to the configured recipient, with a daily idempotency key.

Windows builds use esbuild's WASM implementation to avoid a native binary's parent-directory lookup failure in restricted environments. Linux deployments use normal Wrangler behavior. Both generate the same ES-module bundle.

## Configure live delivery

Copy `.env.example` to `.env`, then set `RESEND_API_KEY` and `EMAIL_FROM` to your verified sender. In Preferences, enter your own address, choose the frequency and enable digests. Set `ENABLE_SCHEDULER=true` and restart the server. The process must remain running and `data/` must be on persistent storage. It checks sources hourly, starting ten seconds after startup. Daily delivery is scheduled for 8:00 a.m. America/New_York time, including daylight saving. The scheduler checks delivery every minute and retries within the following hour; a missed morning is not sent in the afternoon. DELIVERY_TIME and DELIVERY_TIMEZONE configure the daily schedule. Weekly delivery is measured from the last successful send. Important-only delivery considers high-impact items and runs at most hourly. It sends up to your chosen 5–10 limit, fewer when there is less news, and nothing when there are no new matches.

For optional AI summaries and relevance ranking, set `OPENAI_API_KEY` and `OPENAI_MODEL` to a Responses-compatible model available in your account. Only public announcement text and the technology identifier go to OpenAI, not your email address. Without configuration or on provider failure, deterministic keyword rules are used and labeled. Existing stored items are not automatically reranked. `GITHUB_TOKEN` optionally increases GitHub's API quota. Keys never reach the browser.

## Included

- 22 selectable technologies, with optional exact project versions.
- Must Know / Useful / Optional feed, text search, responsive layout, keyboard navigation.
- Official GitHub releases and RSS/Atom ingestion with timeouts, last-30-days filtering, stable-release filtering, URL deduplication and promotional-title filtering.
- Persistent settings, updates, source health, and searchable delivery history.
- Email preview, advisory SDET explanations, and copyable Jira-ready task drafts. No Jira task is automatically created.
- Semantic-version comparison where both versions parse; no claim that version ordering determines vulnerability exposure.
- Hourly collection and optional Resend delivery, durable pending records and idempotent retries. Unresolved deliveries older than 23 hours stop sending for operator reconciliation in Resend, because retry safety is no longer guaranteed. Delivery history records provider acceptance, not inbox receipt.

## Coverage and limits

This is a single-user MVP, not a multi-tenant hosted service. Remote binding requires an `APP_TOKEN` of at least 24 characters; put it behind an HTTPS reverse proxy. Enter the token in the app's unlock dialog. Localhost access is guarded against cross-origin writes and DNS rebinding. Back up `data/radar.sqlite`; never commit `.env` or `data/`.

The Sources page makes feed coverage explicit: JavaScript uses V8, C# uses Roslyn, Docker uses Moby, Postman uses Newman, and AI testing uses Playwright MCP. This does not represent every product release or an exhaustive vulnerability database. Some projects rarely publish GitHub Releases; successful polling may return zero items. Feed errors are shown rather than replaced with invented updates. Ranking and promotional filtering are heuristics; inspect the original source. General explanation steps are templates, not additional AI calls. No Gmail access is requested.

Before offering this as a public subscription service, add per-user accounts, verified recipient enrollment, unsubscribe links, and provider webhooks. This remains a private single-user app. The local scheduler needs an always-running computer; the Cloudflare scheduler does not. GitHub Actions runs tests only.

## Test

```sh
npm test
```

Tests cover ranking, digest selection, cadence, validation, feed parsing, HTML safety, SQLite deduplication, version comparison and email retry idempotency. Email tests use a fake provider; they send no real mail.

Integration references: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [Resend send email](https://resend.com/docs/api-reference/emails/send-email), [GitHub releases API](https://docs.github.com/en/rest/releases/releases).


## Focused testing briefing

The default radar tracks Selenium, Playwright, MCP, and AI-assisted testing (Playwright MCP). The strict testing gate applies to both the dashboard and email, independently of delivery frequency. It admits explicit security fixes, breaking changes/deprecations, major testing capabilities, and severe reliability fixes; routine updates and general AI/MCP news are excluded. Official prereleases and announced plans qualify only when they meet the same importance threshold and are labeled Upcoming. Dates are announcement dates, not promised launch dates. Coverage uses official release feeds and the MCP blog; it is conservative rule-based filtering, not exhaustive news monitoring. Empty days do not generate an email. Existing delivery history remains available.
