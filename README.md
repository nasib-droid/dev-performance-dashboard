# Hotsourced Dev Performance Dashboard

Internal dashboard that pulls delivered-task data from Trello and tracks it against quarterly targets.

## Setup

1. Copy the env file and fill in real values:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — Neon Postgres connection string
   - `DASHBOARD_PASSWORD` — shared password for the login gate
   - `TRELLO_API_KEY` / `TRELLO_TOKEN` — from https://trello.com/power-ups/admin. The token needs read *and* write scope, because the QA feedback form posts comments to cards.
   - `TRELLO_BOARD_ID` / `TRELLO_DELIVERED_LIST_ID` — the board and "Delivered" list to sync from

2. Push the schema to Neon:
   ```bash
   npm run db:push
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

**QA feedback:** the QA feedback page (`/qa`) lists the cards in Trello's "In QA" list live. "Copy message + link" copies a team-chat message ending in a signed `/feedback/<card>/<signature>` link that anyone can open without logging in. Each submission is posted to that card as a comment headed with the reviewer's name. Links stop working once the card leaves QA, and changing `DASHBOARD_PASSWORD` invalidates every link.

Optional: set `GOOGLE_CHAT_WEBHOOK_URL` to a Google Chat incoming webhook to get a message for every submission. Use a space that only you are in, so the alerts stay private. Without it, no alerts are sent.

`npm run check` runs the self-checks: cycle-time and working-day maths, quarter navigation, and the Google Chat alert.

## Deploying

Import the GitHub repo into Vercel and set all six env vars above in the Vercel project settings (Settings → Environment Variables). Every push to `main` then deploys to production.

If the schema changes, run `npm run db:push` locally against the same `DATABASE_URL` before or right after deploying.
