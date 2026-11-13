# Nexus-Integration

A supply chain integration platform that monitors, visualizes, and manages data flows between enterprise systems in real time.

Nexus connects ERP, CRM, and PLM systems through a centralized dashboard, providing a single point of visibility into system health, data synchronization events, and error detection.

---

## What It Does

**Integration Hub** — A real-time monitoring dashboard that displays the health of all connected integrations. Status changes, data sync events, and errors surface instantly through WebSocket-driven updates with no page refresh required.

**BOM Importer** — A multi-step wizard for uploading Bill of Materials files (CSV/Excel). The importer parses columns, maps them to a target schema, and validates data integrity before ingestion. Invalid rows are flagged with specific error messages.

**API Playground** — A developer-facing tool that simulates external webhook payloads. You can fire test events as if they were coming from Shopify, Salesforce, or Arena PLM and watch the dashboard react in real time.

**Analytics** — Historical charts showing event volume over time, success/failure breakdowns by integration, and average response latency.

---

## Architecture

The system follows a straightforward event-driven pattern:

1. An external system (or the built-in simulator) sends a POST request to `/api/integrations/webhook/trigger`.
2. The API route validates the payload, determines which integration it belongs to, and writes an activity log to the database.
3. The server pushes a `new-activity` event over Pusher (WebSockets).
4. The client-side dashboard subscribes to this channel and updates the UI immediately.

All data is scoped per user. Authentication gates protected routes through NextAuth middleware, and each user gets their own set of integrations, logs, and settings on first login.

### Database Schema

| Table | Purpose |
|---|---|
| `users` | User accounts (email, name, OAuth provider) |
| `integrations` | Per-user integration definitions (source, destination, status) |
| `activity_logs` | Immutable audit trail of every webhook event |
| `organization_settings` | User-level config (API key, alert preferences, retention) |
| `bom_imports` | Records of uploaded BOM files with row-level validation results |
| `verification_tokens` | Magic link email authentication tokens |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript |
| Database | Neon (serverless PostgreSQL) |
| Real-time | Pusher (WebSockets) |
| Authentication | NextAuth v5 (GitHub OAuth, magic link email, demo credentials) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| File Parsing | PapaParse (CSV), SheetJS (Excel) |
| Testing | Playwright |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A [Neon](https://neon.tech) database
- A [Pusher](https://pusher.com) account

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/Emjaay20/Nexus-Integration.git
cd Nexus-Integration
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="your_neon_postgres_url"

PUSHER_APP_ID="your_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_key"
PUSHER_SECRET="your_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="your_cluster"

AUTH_SECRET="generate_with_openssl_rand_base64_32"
AUTH_URL="http://localhost:3000"
```

Run the database migration, then start the dev server:

```bash
node scripts/migrate.js
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quick Start Credentials

You can sign in immediately without setting up OAuth:

| Field | Value |
|---|---|
| Email | `demo@nexus.dev` |
| Password | `demo1234` |

---

## Testing the Real-Time Flow

You do not need external services connected to verify the platform works. The built-in simulator handles everything:

1. Sign in and navigate to the **Integration Hub** dashboard.
2. Open the **API Playground** at `/developer/playground` in a second tab.
3. Select a preset (e.g. "Shopify Order Created") or write a custom payload.
4. Click **Send Request**.
5. Switch back to the dashboard. The event appears instantly in the activity feed.

You can also test the BOM Importer by uploading the sample CSV available on the import page. On successful validation, it fires an event that also appears on the dashboard.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # REST endpoints (auth, webhooks, BOM)
│   ├── integration-hub/    # Dashboard, logs, analytics, settings
│   ├── bom-importer/       # File upload and validation wizard
│   ├── developer/          # API playground
│   ├── login/              # Authentication page
│   ├── docs/               # Feature documentation
│   ├── api-reference/      # Endpoint reference
│   └── status/             # System health page
├── components/             # React components grouped by feature
├── services/               # Business logic (integration service)
├── lib/                    # Shared utilities (db, pusher, parser, validator)
├── config/                 # Type definitions for integrations
├── db/                     # SQL schema and seed data
└── auth.ts                 # NextAuth configuration
```

---

## License

MIT
