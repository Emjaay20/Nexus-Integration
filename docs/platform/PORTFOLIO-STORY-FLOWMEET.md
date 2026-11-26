# Nexus: research origin, architecture narrative and FlowMeet contact integration

## Positioning: an engineering case study, not a new procurement startup claim

**Why I built it:** While developing my postgraduate engineering project, *A Blockchain-Secure IoT Platform for Remote Patient Monitoring with Interpretable Health Forecasting*, I needed a reliable way to identify and procure physical sensing, microcontroller and support components. I encountered fragmented supplier listings, uneven sourcing evidence, shipping and FX ambiguity, and difficulty comparing whole-BOM costs. Nexus is a separate portfolio-grade answer to this engineering problem.

The public homepage and `/case-study` now put the original problem first, explain how the engineering evolved over seven phases, link source code and demos, and present **Rust/Actix, Go, Next.js, PostgreSQL, CI and release boundaries** explicitly. The product is not described as clinically approved, commercially adopted or proven to predict real supplier failures.

### Connected projects and their real responsibilities

| Project | Link | Relationship to Nexus |
|---|---|---|
| Nexus Integration | https://github.com/Emjaay20/Nexus-Integration | This procurement intelligence platform, software and tests |
| AetherHost | https://github.com/Emjaay20/AetherHost | Separate hosting/control-plane platform; deployment infrastructure used for the hosted Nexus showcase |
| FlowMeet | https://github.com/Emjaay20/Flowmeet | Separate lead intake and booking product. Used for Nexus visitor contact when configured |
| Smart Content Fetcher | https://github.com/Emjaay20/Smart-Crawler-Plugin | Related standalone WordPress web-data tooling; **not** the same runtime as Nexus's permission-gated SmartCrawl |
| Portfolio | https://yusufsaka.dev | Builder's engineering website and other case studies |

These links demonstrate an integrated portfolio with distinct services, not a fictitious shared monolith or unverified supplier agreements.

## FlowMeet contact integration

AetherHost marketing already uses `https://flowmeet.aetherhost.app/book/aetherhost` and the optional `widget.js` with `data-flowmeet-open`. Nexus follows this **documented working integration pattern** without inventing a Nexus booking slug.

**Default:** FlowMeet booking CTA opens the documented **shared founder calendar**. It is an external handoff; a click does not create a booking.

**Optional direct form:** `POST /api/portfolio/contact` validates a small contact request, requires explicit contact-sharing consent, rejects cross-site browser mutation, applies DB-backed per-email and global budgets, accepts a stable `Idempotency-Key`, and forwards **only supported FlowMeet fields** to the fixed provider endpoint `https://flowmeet.aetherhost.app/api/leads`. The server-held FlowMeet API key identifies the correct FlowMeet workspace; the browser never receives it. FlowMeet is responsible for its own workspace checks and idempotent lead storage. The form requests `send_booking_email:false` and never accepts visitor-supplied workspace or permission attributes.

There is intentionally **no free-text message** input: the current FlowMeet authenticated `/api/leads` API accepts name/email/company/role/region but not a persisted free-text message field. The site's enquiry-type selection maps to a labelled `Nexus / ...` role. A new authenticated FlowMeet message contract would require a separately tested schema migration, storage and privacy review.

### Operator configuration

The feature is **off** for visitor contact capture until the operator provisions **a dedicated FlowMeet workspace key** and enables it in the Nexus server environment:

```sh
# Store only in a private runtime secret manager / restricted VPS env, never a client NEXT_PUBLIC_ variable.
NEXUS_FLOWMEET_CAPTURE_ENABLED=false
NEXUS_FLOWMEET_API_KEY=<dedicated FlowMeet API key, at least 32 chars>

# Optional: once a dedicated Nexus booking calendar is provisioned and tested in FlowMeet
NEXUS_FLOWMEET_BOOKING_URL=https://flowmeet.aetherhost.app/book/nexus

# Optional enhancement: load the existing FlowMeet widget on homepage.
# Without this, booking CTA still works as a normal external link.
NEXUS_FLOWMEET_WIDGET_ENABLED=false
```

The example dedicated `/book/nexus` URL is **illustrative until provisioned**; never enable it as a blind default. If `NEXUS_FLOWMEET_BOOKING_URL` is missing or invalid, Nexus falls back to the documented AetherHost/shared founder calendar `/book/aetherhost`. The booking URL can only use a `/book/<slug>` path at `flowmeet.aetherhost.app`; no arbitrary redirect hosts, query credentials or JavaScript URLs.

For private lead capture, FlowMeet `/api/leads` must accept `x-api-key` and bind it to the correct workspace. Do not reuse a customer workspace credential. Create a project-specific key in FlowMeet and confirm the resulting lead appears in that workspace without a booking email.

### Acceptance without sending real contact emails

1. `cd apps/web && npm ci && npm test && npx tsc --noEmit && npm run build`.
2. Inspect `/`, `/case-study`, `/docs`, and the footer on mobile/desktop. Verify research origin, architecture diagram, source links, honest provenance disclosures, and accessible FlowMeet CTA.
3. Keep capture disabled in staging; confirm the form displays an explicit fallback and booking link opens the **configured** FlowMeet calendar (not an invented slug).
4. In a **staging FlowMeet workspace**, generate its own API key, enable capture, and send one labelled consented lead. Confirm it lands in the intended workspace; no duplicate is created by retrying the same request key; no booking email or appointment is created.
5. Test rate limiting, CSRF, invalid booking config, disabled capture, FlowMeet 409 key conflict and failure/timeout. Never send a test enquiry to a real third party without permission.
6. Verify form submission does not place an order, trigger SmartCrawl, reveal API credentials or log personal contact fields.

## Role-specific engineering discussion

For a platform engineering interview, demonstrate the Rust workspace authz design, Go worker bounded concurrency, Postgres revision/fencing strategy, immutable image and rollback checks, and the explicit separation of **research observations vs commercial quotes**. Then show the business reasoning that originated with a physical hardware procurement problem.

The target role may have geographical eligibility conditions; product similarity does **not** override those requirements. The correct value proposition is credible engineering implementation and reviewable decisions, **not** inflated ML accuracy, staff-level tenure or customer impact claims.

## Known limitations

- Direct FlowMeet lead capture requires configured server credentials and has not yet been acceptance-tested against a dedicated Nexus FlowMeet workspace.
- Default booking uses the documented shared founder calendar, not a verified Nexus-specific bookable service.
- External widget code executes only if explicitly enabled in runtime configuration. Normal links continue to work without widget code.
- Production rollout, CRM mapping, verified booking delivery and cross-project lead analytics must each be validated separately.
