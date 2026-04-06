# Smart Public Issue Reporting System

A bilingual (English / Malayalam) civic complaint platform for local self-government bodies in Kerala. Citizens report public issues such as road damage, waste problems, water supply failures, and more — officials manage, assign, and resolve them through role-based dashboards.

## Features

### Citizen-facing

- **Multi-step complaint form** — Guided category → subcategory → details → location → images → contact info flow
- **Image capture** — upload from gallery or capture directly from device camera (up to 3 images per complaint)
- **GPS location** — auto-detect coordinates with reverse-geocoded address; manual entry as fallback
- **Local body & ward selection** — supports Panchayat, Municipality, and Corporation
- **Anonymous reporting** — citizens can file complaints without revealing their identity
- **Tracking ID** — auto-generated ID (e.g. `PKD-GRM-0001`) returned on submission for status lookup
- **Complaint tracking page** — search by tracking ID to view current status, timeline, and history
- **Draft auto-save** — form progress is saved to localStorage so citizens can resume later

### Official dashboards

- **Admin** — view all complaints across local bodies with search, status filter, and pagination
- **Secretary** — manage complaints for their local body; assign to engineers/clerks; set deadlines; filter by status/priority; map view
- **Engineer / Clerk** — view assigned complaints; update status with remarks and proof images; map view with colour-coded pins

### Complaint workflow

10-stage status lifecycle with role-based transitions:

`submitted` → `under_review` → `assigned` → `inspection_scheduled` → `in_progress` → `partially_resolved` / `on_hold` → `resolved` → `closed` (or `rejected`)

### Other

- **Bilingual UI** — full English ↔ Malayalam switcher across all pages
- **Interactive complaint map** — Leaflet-based map with status-coloured markers and popups
- **In-app notifications** — generated on each status change
- **Deadline escalation monitoring** — overdue complaints are auto-escalated with secretary alerts
- **Zod request validation** — server-side schema validation on all API routes
- **Row Level Security** — Supabase RLS policies enforced on every table
- **Supabase Auth** — email/password authentication with middleware-protected routes

## Escalation Cron Setup

- `vercel.json` includes a 5-minute cron call to `/api/complaints/escalations/run`.
- Set `CRON_SECRET` in deployment environment variables.
- Vercel cron sends `Authorization: Bearer <CRON_SECRET>` and the route validates it.
- Keep `POST /api/complaints/escalations/run` for manual secretary/admin-triggered checks from UI.

## Tech Stack

| Layer        | Technology                           |
| ------------ | ------------------------------------ |
| Framework    | Next.js 16 (App Router)              |
| UI           | React 19, Tailwind CSS 4             |
| Language     | JavaScript (JSX)                     |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage) |
| Maps         | Leaflet + React-Leaflet              |
| Validation   | Zod                                  |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST endpoints (complaints, local-bodies, wards, staff, admin)
│   ├── dashboard/        # Role-based dashboards (admin, secretary, engineer, clerk)
│   ├── report-issue/     # Multi-step complaint form
│   ├── track-issue/      # Complaint tracking page
│   └── login/            # Official login
├── components/           # Reusable UI & feature components
├── lib/                  # Utilities, constants, Supabase clients, categories
└── middleware.js          # Auth guard for protected routes
sql/                       # Database migrations (tables, indexes, triggers, RLS)
scripts/                   # Seed scripts for local bodies & staff
docs/                      # Design docs & troubleshooting guides
```
