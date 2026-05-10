# Duddify — Expense Tracker

A beautiful, end-to-end expense tracker that works on **iOS, Android, and web** from a single codebase. Built as a **Progressive Web App (PWA)** so you and your partner just open a URL on your phone, tap "Add to Home Screen", and it looks/feels like a native app — **no app store, no releases**.

## Features

- **Mobile-first quick-add**: tap-friendly keypad, chip-style categories, < 5 sec to log a transaction
- **Real-time household sharing**: you and your partner see the same data, instantly synced
- **6 dashboards**:
  - **Overview** — KPIs, top categories, budget alerts, recent activity
  - **Expenses** — pie + daily bar chart, calendar heatmap, biggest transactions
  - **Investments** — portfolio value, P&L, monthly contributions, holdings table
  - **Income** — sources breakdown, monthly trend
  - **Budgets** — per-category progress bars, over/under indicators
  - **Yearly** — month-on-month comparison, savings rate trend
- **Categories** — fully customisable with colors, icons, and per-category monthly budgets
- **Recurring transactions** — auto-create rent, SIPs, salary every month
- **Investment holdings** — manual portfolio tracker (MF, Stocks, FD, Gold, Crypto, etc.)
- **Who-owes-whom** — automatic settlement calculation
- **CSV export**, **dark mode**, **offline support**, **multi-currency**

## Tech stack

- **Next.js 15** + TypeScript + Tailwind + shadcn-style UI
- **Supabase** (Postgres + Auth + Real-time) — free tier
- **Recharts** for charts
- **PWA** (manifest + service worker) — installable on iOS & Android
- **Vercel** for hosting — free tier, `git push` = live

---

## Setup — 3 steps, ~10 minutes

### 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**. Pick any name, region close to you, set a database password.
3. Wait ~1 minute for provisioning.
4. In the left sidebar, click **SQL Editor** → **New query**.
5. Open `supabase/schema.sql` from this repo, copy-paste the **entire** contents, and click **Run**.
   - This creates all tables, RLS policies, triggers, and helper functions.
6. *(Optional)* If you want recurring transactions to auto-process daily, also run `supabase/cron.sql`.
7. Enable **Google sign-in**:
   - Sidebar → **Authentication** → **Providers** → **Google** → **Enable**.
   - Follow the prompts (you'll need a Google Cloud OAuth client — Supabase docs walk you through it). 5 minutes.
   - Alternatively, you can skip this and just use the magic-link email login — works out of the box.
8. Go to **Project Settings** → **API**. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 2. Run locally first (optional but recommended)

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env.local

# 3. Edit .env.local and paste your Supabase URL + anon key

# 4. Start the dev server
npm run dev
```

Open `http://localhost:3000`. Sign in → create your household → start logging.

### 3. Deploy to Vercel (~3 minutes, free, no app store)

1. Push this repo to **GitHub** (any account, can be private).
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New** → **Project** → pick this repo → click **Import**.
4. Add the two environment variables from step 1:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. ~2 min later you get a URL like `https://duddify-xxxx.vercel.app`.
6. Back in **Supabase** → **Authentication** → **URL Configuration**:
   - Set **Site URL** to your Vercel URL.
   - Add `https://your-vercel-url.vercel.app/auth/callback` to **Redirect URLs**.

That's it — every `git push` to main now auto-deploys.

### 4. Install on iOS and Android

**iOS (Safari):**
1. Open the Vercel URL.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Done. The icon appears on your home screen and launches in full-screen mode.

**Android (Chrome):**
1. Open the URL.
2. Tap the menu (⋮) → **Add to Home screen** / **Install app**.
3. Done.

The app works offline (cached) and syncs when back online.

### 5. Invite your partner

1. They open your Vercel URL on their phone.
2. They sign in with their own Google/email.
3. On the onboarding screen, they pick **Join existing**.
4. You go to **Settings** → **Household** → **Copy** ID, send it to them.
5. They paste it → joined. Same data, same dashboards, instantly.

---

## Project structure

```
src/
├── app/
│   ├── (app)/          # Protected app routes — overview, dashboards, etc.
│   │   ├── page.tsx    # Overview dashboard (homepage)
│   │   ├── add/        # Quick add transaction
│   │   ├── expenses/   # Expenses dashboard
│   │   ├── investments/# Investments dashboard
│   │   ├── income/     # Income dashboard
│   │   ├── budgets/    # Budgets dashboard
│   │   ├── yearly/     # Yearly overview
│   │   ├── transactions/# Full transactions list
│   │   ├── categories/ # Categories CRUD
│   │   └── settings/   # Settings
│   ├── auth/           # Auth callback + signout
│   ├── login/          # Login page
│   └── onboarding/     # First-time household setup
├── components/         # UI + feature components
├── lib/
│   ├── analytics.ts    # All chart data computations
│   ├── supabase/       # Supabase client (browser, server, middleware)
│   ├── hooks/          # Data fetching hooks
│   ├── types.ts        # Domain types
│   └── utils.ts        # Currency, date helpers
└── middleware.ts       # Auth gate

supabase/
├── schema.sql          # Tables, RLS, RPCs, seed categories
└── cron.sql            # Optional: pg_cron for recurring rules

public/
├── manifest.webmanifest
├── sw.js               # Service worker (offline support)
└── icons/              # PWA icons
```

## Customising

- **Add categories**: Categories page → `+ New`.
- **Set budgets**: Categories → edit any expense category → Monthly budget.
- **Change currency**: Settings → Household → Currency.
- **Change theme**: Top right toggle (also respects system dark mode).
- **Add recurring**: insert a row into `recurring_rules` (UI for this is a small TODO; rows you add manually in Supabase Studio will be auto-processed if you enabled `cron.sql`).

## Privacy & cost

- **Free forever** for personal use on Supabase + Vercel free tiers.
- All data is yours, in your Supabase project.
- Row-Level Security ensures each household's data is fully isolated.

## Roadmap (easy to add)

- [ ] Recurring transactions UI (CRUD page) — schema and cron already in place
- [ ] Receipt photo upload (Supabase Storage)
- [ ] Push notifications via Supabase Edge Functions
- [ ] Monthly email summaries

## License

MIT — do whatever.
