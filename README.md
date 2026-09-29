# Hotsourced Dev Performance Dashboard

Internal dashboard that pulls delivered-task data from Trello and tracks it against quarterly targets.

## Setup

1. Copy the env file and fill in real values:
   ```bash
   cp .env.local.example .env.local
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

## Deploying

Push to Vercel, connect the same Neon database, and set all six env vars above in the Vercel project settings.
