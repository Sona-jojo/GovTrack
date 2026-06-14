# GovTrack — Local Setup

## 1. Install

```bash
npm install
```

## 2. Environment

Copy `.env.local.example` to `.env.local` and add your Supabase keys:

```bash
copy .env.local.example .env.local
```

Required for full functionality:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (staff login, admin APIs, complaint submission)

## 3. Database

Run the SQL scripts in `scripts/` against your Supabase project (SQL Editor):

1. `setup-rls-policies.sql`
2. `seed-local-bodies.sql`
3. Optional: `node scripts/seed-staff.js` to create demo staff accounts

Default demo staff password from seed script: `NP@12345`

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000

## Pages

| URL | Purpose |
|-----|---------|
| `/` | Landing page |
| `/report-issue` | Citizen complaint form |
| `/track-issue` | Track by complaint ID |
| `/login` | Official staff login |
| `/dashboard` | Role-based dashboards |

## Deploy

Works on Vercel. Set the same env vars in the Vercel project settings.
