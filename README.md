# UpKeep

A household obligations tracker for the important-but-infrequent deadlines that are easy to
forget — passport/ID renewals, insurance, bills, vehicle and home maintenance, antivirus and
software renewals.

- One admin manages everything behind a single shared password.
- Family members get a private, unguessable **read-only link** — no account required.
- Reminders fire at 30/7/1 days before, on the due date, and daily while overdue (in-app always,
  by email if you configure SMTP).
- Recurring obligations never silently roll over — the admin must confirm the real next date.
- **UpKeep never stores passport numbers, policy numbers, scans, or payment details.** Notes are
  free text for context only ("renew at the DMV on Elm St") — never put sensitive numbers there.

## Stack

- **Next.js 16** (App Router) — frontend and backend in one project. All data access goes through
  route handlers under `/api`, so the same backend could later serve a mobile app too.
- **MongoDB** for storage.
- **Tailwind CSS v4** for styling, built on a small custom design-token palette.
- **jose** for signed session cookies (single admin session, no user accounts to manage).
- **bcryptjs** for the admin password hash.
- **nodemailer** for reminder emails (optional — the app works fine without it, reminders just
  stay in-app only).

## 1. Set up MongoDB

Easiest path: create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), create
a database user, and allow network access from anywhere (`0.0.0.0/0`) for now — you can restrict
it once you know your deploy target's IP range. Copy the connection string.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

- `MONGODB_URI` — your connection string from step 1.
- `SESSION_SECRET` — run `openssl rand -base64 48` and paste the result.
- `VIEW_TOKEN` — run `openssl rand -hex 24` and paste the result. This is the secret in the family
  link; treat it like a password.
- `CRON_SECRET` — run `openssl rand -hex 24` and paste the result.
- `ADMIN_PASSWORD_HASH` — see step 3 below.
- SMTP settings — optional, see "Email reminders" below.

## 3. Set the admin password

Passwords are never stored in plain text. Generate a hash and paste it into `.env`:

```bash
npm install
node scripts/hash-password.js "your-chosen-password"
```

Paste the printed `ADMIN_PASSWORD_HASH=...` line into `.env`.

## 4. Run it locally

```bash
npm install   # if you haven't already
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/login`. Sign in with the password you hashed
above.

Optional: seed a few example obligations so the dashboard isn't empty on first run:

```bash
npm run seed
```

## 5. Try the family link

In the dashboard header, click **Family link** to reveal the read-only URL
(`/view/<VIEW_TOKEN>`). Anyone with that exact link can see upcoming deadlines — no login. You can
copy it or regenerate it (instantly invalidating the old one) from **Settings**.

## 6. Email reminders (optional)

Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env`. Any standard
SMTP provider works (a Gmail App Password, SendGrid, Postmark, Resend's SMTP endpoint, etc). Add
recipient addresses either via `NOTIFICATION_EMAILS` in `.env` or from the **Settings** page once
the app is running (Settings wins — it's stored in the database and editable without a redeploy).

If SMTP isn't configured, the app still works fully — reminders just show up in the dashboard's
overdue/due-today/upcoming filters instead of arriving by email.

### How reminders actually fire

`GET /api/cron/reminders`, protected by `CRON_SECRET`, checks every obligation once a day and sends
any 30/7/1-day, due-today, or daily-overdue emails that haven't already gone out today (it logs
each one to avoid duplicates). Nothing else calls this automatically until you schedule it — see
deployment below.

## 7. Push to GitHub

```bash
git init
git add .
git commit -m "Initial UpKeep build"
git branch -M main
git remote add origin https://github.com/<you>/upkeep.git
git push -u origin main
```

`.env` is already git-ignored, so your secrets won't be committed. Double-check with
`git status` before your first push.

## 8. Deploying (when you're ready)

This isn't deployed yet, but when you are:

1. Import the repo at [vercel.com](https://vercel.com), or run `vercel` from this folder.
2. In the Vercel project's **Environment Variables**, add everything from your `.env` file.
3. Make sure your MongoDB Atlas cluster's network access allows connections from Vercel (or keep
   `0.0.0.0/0` while testing).
4. `vercel.json` already schedules `/api/cron/reminders` to run daily at 08:00 UTC via Vercel Cron.
   Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` to cron endpoints when a
   `CRON_SECRET` env var is set, which is exactly what this route checks for.
5. Visit the live URL, confirm login, adding an obligation, and the family link all work.

Just ask me when you want help with this step — I can walk through it with you.

## Project structure

```
app/
  page.js                     redirects to /login or /dashboard
  login/                      admin login
  dashboard/                  admin dashboard (protected)
    settings/                 family link, notification emails, password change
  view/[token]/               public read-only family view
  api/
    auth/login, auth/logout   admin session
    obligations/              CRUD (protected)
    obligations/[id]/confirm-next   manual recurrence rollover (protected)
    public/[token]/           read-only data for the family link (no auth)
    settings/                 admin settings (protected)
    cron/reminders/           daily reminder job (CRON_SECRET-protected)
lib/                          DB connection, auth, dates/recurrence, categories, email, validation
components/                   shared UI (category icons, the due-date countdown chip, modals)
scripts/                      hash-password.js, seed.js
```

## Data model

**`obligations`**: title, category, dueDate (`YYYY-MM-DD`), notes (free text, non-sensitive),
recurring (bool) + recurrence (`{interval, unit}`), reminderOffsets (days-before list),
status (`active`/`done`), lastConfirmedAt, createdAt/updatedAt.

**`settings`** (single document): adminPasswordHash, viewToken, notificationEmails.

**`reminderLogs`**: one entry per obligation/reminder-kind/day, so the cron job never double-sends.

## Security notes

- The admin route group (`/dashboard/*`, `/api/obligations/*`, `/api/settings/*`) is protected by
  `middleware.js`, which checks a signed session cookie before any of those handlers run.
- The family link's only protection is the token itself being long, random, and never listed or
  guessable — which is sufficient because nothing sensitive is ever stored behind it in the first
  place.
- Regenerating the family link (Settings page) immediately invalidates the old one.
