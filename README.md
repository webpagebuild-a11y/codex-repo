# SDET Radar

A personal technology briefing for test automation engineers. A small Node.js 24 app with a responsive dashboard, SQLite storage, official release collection, optional OpenAI ranking, and Resend digests.

## Run locally

```sh
npm ci
npm start
```

Open http://127.0.0.1:3000. No API keys are needed to explore the clearly labeled sample briefing, save preferences, or collect official updates. Samples never enter the database or email pipeline. Node.js 24 or later is required for built-in SQLite; its experimental warning is expected.

## Configure live delivery

Copy `.env.example` to `.env`, then set `RESEND_API_KEY` and `EMAIL_FROM` to your verified sender. In Preferences, enter your own address, choose the frequency and enable digests. Set `ENABLE_SCHEDULER=true` and restart the server. The process must remain running and `data/` must be on persistent storage. It checks sources hourly, starting ten seconds after startup. First eligible delivery is sent on the first run; subsequent daily/weekly deliveries are measured from the last successful send. Important-only delivery considers high-impact items and runs at most hourly. It sends up to your chosen 5–10 limit, fewer when there is less news, and nothing when there are no new matches.

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

Before offering this as a public subscription service, add per-user accounts, verified recipient enrollment, unsubscribe links, timezone-based scheduling, provider webhooks, and a durable external worker. The included scheduler serves a personal always-running deployment; GitHub Actions runs tests only.

## Test

```sh
npm test
```

Tests cover ranking, digest selection, cadence, validation, feed parsing, HTML safety, SQLite deduplication, version comparison and email retry idempotency. Email tests use a fake provider; they send no real mail.

Integration references: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [Resend send email](https://resend.com/docs/api-reference/emails/send-email), [GitHub releases API](https://docs.github.com/en/rest/releases/releases).
