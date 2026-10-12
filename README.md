# Vexos Health — ICU Telemetry Frontend

Web app for the VEXOS ICU platform. Nurses, doctors and administrators use it to watch every bed live, chart and validate hourly observations, acknowledge alarms and manage the system.

It talks to the VEXOS backend (FastAPI). API docs: `https://44.214.112.234/docs`

---

## Contents

1. [What the app does](#1-what-the-app-does)
2. [Tech stack](#2-tech-stack)
3. [Before you start](#3-before-you-start)
4. [Run it locally, step by step](#4-run-it-locally-step-by-step)
5. [Environment variables](#5-environment-variables)
6. [npm scripts](#6-npm-scripts)
7. [How the app gets its data](#7-how-the-app-gets-its-data)
8. [Project structure](#8-project-structure)
9. [Using the main features](#9-using-the-main-features)
10. [Building and deploying](#10-building-and-deploying)
11. [Working on the code](#11-working-on-the-code)
12. [Troubleshooting](#12-troubleshooting)
13. [Known limitations](#13-known-limitations)

---

## 1. What the app does

Each role signs in and lands on its own screens. The role comes from the login token.

| Role | Screens |
|---|---|
| **Nurse** | Unit board · Flowsheet (validation, data entry, CSV export) · Vitals trends · Alerts |
| **Doctor** | My patients · Unit board · Patient chart (read-only flowsheet) · Vitals trends · Alerts · Analytics |
| **Administrator** | Users & access · Sign-in log · HL7 ingestion · Beds · Hospital settings |

Highlights:

- **Live data.** One WebSocket per signed-in user streams vitals from bedside monitors. If the stream drops, the app reconnects automatically and polls the API every 30 seconds in the meantime.
- **Unit board.** A card per bed shows HR, SpO₂, MAP, RR, the NEWS2 (EWS) score and ventilator status. Out-of-range values are flagged, and an alerts rail lets you acknowledge alarms.
- **Flowsheet.** An hourly grid where nurses validate monitor values, enter or override values (rhythm, GCS, ventilator mode and more) and export to CSV.
- **Admin tools.** Create, deactivate and reactivate users, enable MFA, review sign-in attempts, monitor and configure HL7 ingestion, and discharge or assign beds.

## 2. Tech stack

- [React 19](https://react.dev) + [Vite 8](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components (Base UI primitives) in `src/components/ui`
- [React Router 7](https://reactrouter.com). Each page is code-split per route.
- [Recharts](https://recharts.org) for charts
- [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) for forms
- [sonner](https://sonner.emilkowal.ski) for toasts
- JavaScript (no TypeScript), ESLint

## 3. Before you start

You need:

1. **Node.js 20.19+ or 22.12+.** Vite 8 needs this. Check with `node -v`.
2. **npm**, which comes with Node.
3. **Git**, and access to the repository.
4. **A VEXOS account.** Ask an administrator to create one for you in *Users & access*. Accounts are not self-service on the live backend. You need one per role you want to test (nurse, physician, admin).

> Never commit credentials. `.env` is git-ignored. Keep passwords out of code, issues and chat.

## 4. Run it locally, step by step

**Step 1: Clone the repository**

```bash
git clone https://github.com/HimanshuParodiya/vexos_health.git
cd vexos_health
```

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Create your `.env` file**

```bash
cp .env.example .env
```

The defaults point at the shared VEXOS backend through the dev proxy, which works out of the box. See [Environment variables](#5-environment-variables) to change anything.

**Step 4: Start the dev server**

```bash
npm run dev
```

Open the URL Vite prints, usually <http://localhost:5173>. If that port is taken, Vite picks the next free one.

**Step 5: Sign in**

Enter your VEXOS username and password. If MFA is enabled on your account, also enter the 6-digit code from your authenticator app (see [MFA](#mfa-two-factor-sign-in)). You land on your role's home screen.

**Step 6 (optional): Check your change before pushing**

```bash
npm run lint
npm run build
```

## 5. Environment variables

Set these in `.env`. Only variables starting with `VITE_` reach the browser. Restart `npm run dev` after changing them.

| Variable | Example | What it does |
|---|---|---|
| `VITE_API_BASE_URL` | *(empty)* | Leave empty in development so requests go through the Vite proxy. That avoids browser errors from the backend's self-signed certificate. For production builds, see [Building and deploying](#10-building-and-deploying). |
| `VITE_BACKEND_TARGET` | `https://44.214.112.234` | Where the dev proxy forwards `/api` (including the WebSocket), `/health`, `/ready` and `/openapi.json`. Used by `npm run dev` only. |
| `VITE_USE_MOCK_API` | `false` | `true` fakes only the login, with demo accounts. All dashboards still call the real API. Keep it `false`. |
| `VITE_DEV_USERNAME` | `frontend_dev` | Username pre-filled on the login form. |
| `VITE_ORG_NAME` | `City Care Hospital` | Hospital name shown until `GET /api/v1/hospital` responds. |
| `VITE_ORG_LOGO_URL` | *(empty)* | Optional fallback logo. |

## 6. npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server with hot reload and the API proxy |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Serves `dist/` locally to check a build |
| `npm run lint` | Runs ESLint on the whole project |

## 7. How the app gets its data

```
Browser ──► Vite dev server (localhost:5173)
              │  /api, /health, /ready, /openapi.json   (proxy, keep-alive)
              ▼
           VEXOS backend (https://44.214.112.234)
              ├─ REST   /api/v1/...            beds, vitals, EWS, alerts, HL7, users …
              └─ WS     /api/v1/stream/vitals  live monitor packets
```

- **Login.** `POST /api/v1/identity/login` returns a JWT. The app keeps it in `sessionStorage` and sends it as `Authorization: Bearer …`. Any `401` signs you out.
- **Clinical screens (nurse, doctor)** share two providers that are mounted once:
  - `TelemetryProvider` (`src/features/telemetry`) opens the WebSocket, reconnects with backoff and normalises each packet.
  - `UnitDataProvider` (`src/features/unit`) loads the hospital, beds, alerts, analytics, and each bed's latest vitals, ventilator data and EWS. It applies live packets once per second and polls every 30 seconds. While the stream is down, each poll also reloads every bed's telemetry.
- **Admin screens** call the API directly through the hooks in `src/features/admin/hooks`.
- **All endpoints** are wrapped in `src/services/vexos-api.js`. Add new calls there.

## 8. Project structure

```
src/
├── app/                 App root and router (role → routes)
├── components/
│   ├── ui/              shadcn/ui components (generated, keep edits minimal)
│   ├── common/          Shared building blocks: Panel, KpiStrip, SegmentedNav, …
│   ├── dashboard/       Shared Recharts styling (chart-styles.js)
│   └── layout/          App shell: sidebar, top bar, live status
├── config/              env, roles, routes, organization fallback
├── features/
│   ├── auth/            Login, session, route guards
│   ├── telemetry/       Live WebSocket provider
│   ├── unit/            Unit data provider, unit board, alerts, bed search
│   ├── flowsheet/       Flowsheet grid, validation store, CSV export
│   ├── trends/          Vitals trend charts
│   ├── nurse/           Nurse navigation
│   ├── doctor/          My patients, analytics, doctor navigation
│   └── admin/           Users, sign-in log, HL7, beds, settings
├── hooks/               useAsyncData, useNow, usePolling
├── lib/                 clinical.js (limits, EWS, parsing), format.js, utils.js
├── services/            HTTP client, JWT helpers, token storage, VEXOS API
└── App.css              Tailwind setup and theme tokens (colours, fonts)
```

**Adding a page:**

1. Create it under the right feature, for example `src/features/nurse/pages/MyPage.jsx`.
2. Register it in that role's `routes` list in `src/app/router.jsx`.
3. Add a menu entry in the role's `*.nav.js`.

**Adding a role:** add it to `src/config/roles.js`, create its feature folder, then register it in `ROLE_MODULES` in `src/app/router.jsx`.

## 9. Using the main features

### Flowsheet: validation and data entry

Open it from **Flowsheet** in the nurse menu, or with **Open** on a bed card.

1. **Pick the bed** in the selector at the top.
2. **Choose the time window.** Use ‹ › to move, **Jump to now** to return to the present, and **Interval** to switch between 1 h, 30 min and 15 min columns. If a bed has stopped sending data, the grid opens on its last readings.
3. **Read the colours:**
   - amber cell: outside normal limits
   - red-outlined cell: critical
   - dotted underline: came from the monitor and is not yet validated
   - blue dot: entered manually (hover to see who entered it and the original monitor value)
4. **Enter or correct a value.** Click a cell, type, then press **Enter** to save or **Esc** to cancel. Rhythm and ventilator mode open a list. GCS is free text (for example `E4V5M6`). Clear a cell to remove your entry.
5. **Validate.** Click **Validate** under a column, or **Validate N pending** for every finished column. Validated columns are locked. To undo, click the validator's initials.
6. **Export.** **Export CSV** downloads the visible window with the patient header, units, manual-entry markers and who validated each column.

Doctors see the same grid read-only under **Patient chart**.

> ⚠️ The backend has no endpoint for validations yet, so validations and manual entries are saved in **this browser only** (`localStorage`). Other users and devices don't see them. `src/features/flowsheet/flowsheet-store.js` is the only file to change once an endpoint exists.

### MFA (two-factor sign-in)

The 6-digit codes come from an authenticator app on the user's phone (Google Authenticator, Microsoft Authenticator, Authy, …). They are not sent by SMS or email.

1. An **administrator** opens **Users & access**, then either:
   - uses the **⋯** menu on a user's row and chooses **Enable MFA…**, or
   - ticks **Require MFA** when creating a user.
2. A dialog shows a **setup key**. It is shown only once, so copy it.
3. Give the key to the user in person or over chat, not by email.
4. The user adds it in their authenticator app: **Add account → Enter a setup key**.
5. From then on, every login needs the **MFA code** field filled in.

If a phone is lost, an admin uses **⋯ → Disable MFA**. The user can then sign in with a password only, and MFA can be enabled again.

### Admin: HL7 ingestion

- **Sweep queue now** processes pending HL7 messages straight away.
- **Source configuration** switches where messages come from (local folder, S3, SQS or RabbitMQ). Saving asks for confirmation because it affects every bed's live feed. SQS and RabbitMQ consumers start only when the server restarts.

## 10. Building and deploying

```bash
npm run build      # outputs static files to dist/
npm run preview    # optional local check
```

The Vite proxy exists **only in development**. In production, choose one of these setups.

**Option A (recommended): put a reverse proxy in front of both.** Serve `dist/` and forward API paths to the backend on the same origin. Leave `VITE_API_BASE_URL` empty. Example for nginx:

```nginx
location / {
  root /var/www/vexos/dist;
  try_files $uri /index.html;          # SPA fallback for client-side routes
}

location ~ ^/(api|health|ready|openapi\.json) {
  proxy_pass https://44.214.112.234;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;   # WebSocket for /api/v1/stream/vitals
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

**Option B: call the backend directly.** Set `VITE_API_BASE_URL=https://<backend-host>` **before** running `npm run build`, because the value is baked into the bundle. This needs two things from the backend:

1. a TLS certificate browsers trust, and
2. CORS that allows the frontend's origin with credentials.

Either way, the static host must send every unknown path to `index.html`, so routes like `/nurse/flowsheet` work after a page refresh.

## 11. Working on the code

**Branches:** create a branch from `main` for each change, for example `feat/flowsheet-filters` or `fix/alert-timer`. Open a pull request into `main`.

**Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org), one feature per commit:

```
feat(flowsheet): add parameter filter
fix(alerts): stop timer drift after reconnect
refactor(unit): split bed card footer
```

**Before you push:** run `npm run lint` and `npm run build`. Both must pass.

**Conventions:**

- Put API calls in `src/services/vexos-api.js`, and clinical rules (alarm limits, EWS colours, parsing) in `src/lib/clinical.js`.
- Use theme tokens such as `bg-card`, `text-critical`, `bg-warning-surface` and `text-good` instead of raw colours. They are defined in `src/App.css`.
- Add shadcn components with `npx shadcn@latest add <name>`. Afterwards, check that the new file imports `cn` from `@/lib/utils`.

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| Login says *Incorrect username or password* | Check your credentials. MFA accounts also need the code. Repeated failures can lock the account for a while. Ask an admin to check the **Sign-in log**. |
| Top bar dot is red or amber ("reconnecting") | The live stream is down. The app keeps polling every 30 seconds. Click the **HL7 · time** indicator to force a reconnect. |
| Every bed shows **Monitor offline** | The backend hasn't received HL7 data recently. Check **HL7 ingestion** as an admin. This isn't a frontend problem. |
| `Port 5173 is already in use` | Another dev server is running. Vite usually moves to the next port, or run `npx vite --port 5174`. |
| Pages are blank after a refresh in production | The static host is missing the SPA fallback to `index.html`. See [Building and deploying](#10-building-and-deploying). |
| Admin pages show *lacks 'admin' permission* | The account isn't an admin. Sign in with an administrator account. |
| Changes to `.env` have no effect | Restart `npm run dev`. For production, rebuild. |

## 13. Known limitations

These are tracked for the backend team:

- `GET /patients/{mrn}/vitals` returns only the **latest** reading, whatever window you ask for. Flowsheet history therefore builds up from the live stream while the app is open.
- Vitals timestamps are local time labelled as UTC (`+00:00`), so they show about 5 h 30 min late.
- `GET /hl7/source-config` returns broker credentials (including passwords) to non-admin users. The UI masks them, but the backend should restrict the endpoint.
- There is no doctor-to-patient assignment yet, so **My patients** lists everyone on the unit.
- Flowsheet validations are stored per browser until a backend endpoint exists (see [Flowsheet](#flowsheet-validation-and-data-entry)).
- The payload for **Assign patient / Link identity** (`{ mrn, name, gender }`) hasn't been confirmed against the backend.
