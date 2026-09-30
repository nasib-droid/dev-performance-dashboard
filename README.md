# Hotsourced Dev Performance Dashboard

Internal dashboard that pulls delivered-task data from Trello and tracks it against quarterly targets.

## Setup

1. Copy the env file and fill in real values:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — Neon Postgres connection string
   - `DASHBOARD_PASSWORD` — shared password for the login gate
   - `TRELLO_API_KEY` / `TRELLO_TOKEN` — from https://trello.com/power-ups/admin
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

`npm run check` runs the cycle-time self-check (working-day and time-in-list maths).

## Deploying

Import the GitHub repo into Vercel and set all six env vars above in the Vercel project settings (Settings → Environment Variables). Every push to `main` then deploys to production.

If the schema changes, run `npm run db:push` locally against the same `DATABASE_URL` before or right after deploying.
