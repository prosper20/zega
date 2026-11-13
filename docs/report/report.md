# 1. Introduction and problem statement

The university receives maintenance complaints and service requests through phone calls, paper
forms, WhatsApp messages and office visits. Each channel loses information in its own way: a phone
call leaves no record, a paper form can be misplaced, a WhatsApp message scrolls out of view and an
office visit depends on who happens to be at the desk. The result is the set of problems named in
the brief: delays, missing records, poor tracking and no accountability. Nobody can say how many
faults are open, how long they have been open, who is working on them or whether they were ever
fixed.

**ZEGA** ("Report it. Track it. Resolve it.") replaces these channels with one web platform. Students
and staff report a fault in under a minute, optionally by scanning a QR sticker in the room. The
request is routed to an administrator, assigned to a maintenance officer with the right skills and
followed through every status change until the requester confirms the fix. Every action is stored
with who did it and when, in an audit trail that cannot be edited.

ZEGA is live at **<https://zega-ms.vercel.app>** with seeded demonstration data and four demo
accounts (section 10).

# 2. System objectives

1. **One accountable channel.** Every request gets a human reference (for example `ZG-26-000122`),
   an owner, a status and a full history. Nothing is lost between a report and a repair.
2. **Fast, guided reporting.** A four-step form with category cards, a location picker or QR scan,
   photo evidence and duplicate detection, so requesters give officers what they need the first time.
3. **Clear work for officers.** A work-order board ordered by urgency, with notes, before and after
   photos and only the status changes the lifecycle allows.
4. **Control for administrators.** Triage, smart assignment, bulk actions, user and role
   management, categories and service level targets, locations and QR stickers, reports and exports.
5. **Live visibility.** Status changes and notifications reach every open screen within a second,
   without refreshing.
6. **Accountability by design.** Role-based access enforced on the server, service level targets with
   escalation, and a tamper-evident audit trail.
7. **Engineering quality.** A documented REST API, automated tests at every level and a reproducible
   deployment connected to a managed database.

# 3. Requirement analysis

## 3.1 Actors

| Actor | Goal |
| --- | --- |
| Student / Staff (requester) | Report faults, follow progress, confirm or reopen fixes, rate the service |
| Maintenance officer | See assigned jobs, update progress with notes and photos, mark jobs resolved |
| Administrator | Triage and assign requests, manage users, roles and catalogue, monitor and report |
| System | Escalate service level breaches, close unconfirmed fixes after 72 hours, purge expired data |

## 3.2 Use cases

```mermaid
flowchart LR
  R([Student / Staff])
  O([Maintenance officer])
  A([Administrator])
  S([System scheduler])
  subgraph ZEGA
    UC1[Register and log in]
    UC2[Report a fault with photos or QR]
    UC3[Track request and timeline]
    UC4[Confirm and rate or reopen]
    UC5[Add me too vote]
    UC6[View assigned jobs on the board]
    UC7[Update status with notes and photos]
    UC8[Triage, assign and bulk update]
    UC9[Manage users, roles and specialties]
    UC10[Manage categories, SLAs and locations]
    UC11[Reports and PDF or CSV export]
    UC12[View and verify audit trail]
    UC13[Escalate SLA breaches and auto close]
  end
  R --- UC1 & UC2 & UC3 & UC4 & UC5
  O --- UC1 & UC6 & UC7
  A --- UC1 & UC8 & UC9 & UC10 & UC11 & UC12
  S --- UC13
```

## 3.3 Functional requirements

| ID | Requirement | Where it is met |
| --- | --- | --- |
| FR1 | Users register (students and staff) and log in; officers and admins are created by an admin | `/auth/register`, `/auth/login`, Users & roles screen |
| FR2 | Each role has its own dashboard and navigation | `/dashboard` (requester, officer), `/dashboard/admin` |
| FR3 | Requesters submit a service request with category, location, priority, description and photos | Report form (`/dashboard/requests/new`) |
| FR4 | Requesters track each request: status steps, SLA, timeline, comments | Request page (`/dashboard/requests/{ref}`) |
| FR5 | Admins list, search, filter, sort and paginate all requests, and bulk assign or reprioritise | All requests screen |
| FR6 | Admins assign requests to officers, helped by ranked suggestions | Assignment dialog, `GET /api/requests/{id}/suggestions` |
| FR7 | Officers view assigned requests, update progress and mark them resolved | Work board and job page |
| FR8 | Status changes follow a defined lifecycle and are logged with actor and note | `src/domain/request-machine.ts`, `status_logs` |
| FR9 | Admins manage users, roles, officer specialties, categories, SLA targets and locations | Admin screens |
| FR10 | Admins generate reports and export PDF and CSV | Reports screen, `/api/exports/*` |
| FR11 | Users receive in-app and email notifications; status updates appear live | Notification bell, SSE `/api/events`, Resend |
| FR12 | Every change is recorded in an audit trail that can be verified | Audit trail screen, `GET /api/audit/verify` |

## 3.4 Non-functional requirements

| Area | Requirement and approach |
| --- | --- |
| Security | Passwords hashed with scrypt; httpOnly SameSite session cookies; role checks on every API route; rate limiting; Content Security Policy and other security headers |
| Usability | Responsive from 360px phones to desktops; bottom tab bar and card layouts on phones; 44px touch targets; clear validation and feedback messages |
| Accessibility | Semantic HTML, labelled controls, keyboard support, visible focus, reduced motion respected |
| Performance | Server-rendered first view, keyset pagination, indexed search, lazy-loaded media |
| Reliability | Database transactions for every multi-step change; emails sent only after commit; health endpoint |
| Maintainability | TypeScript strict mode, one shared schema per contract (Zod), layered code, automated tests and CI |
| Privacy | EXIF metadata stripped from photos in the browser; retention purge; privacy page |

# 4. Frontend technologies used

| Technology | Use in ZEGA |
| --- | --- |
| **Next.js 16** (App Router, React Server Components, Turbopack) | Routing per role, server-rendered first view, metadata and Open Graph images, `proxy.ts` for sign-in redirects |
| **React 19** with the React Compiler | Interactive client components |
| **TypeScript** (strict) | Types shared between browser, API and database |
| **Tailwind CSS v4** and **shadcn/ui** (Radix primitives) | Design system, accessible dialogs, menus, selects and sheets; light and dark themes |
| **TanStack Query** | Server state, caching, optimistic updates and live invalidation |
| **nuqs** | Filters, sorting and pages stored in the URL, so views can be shared and survive the back button |
| **React Hook Form + Zod** | Form state and validation with the same schemas the API uses |
| **dnd-kit** | Drag and drop on the officer work board |
| **Recharts** | Dashboard and report charts |
| **Sonner** | Toast feedback messages |
| **cmdk** | Command palette and search |
| Service worker and web manifest | Installable app with an offline page |

The interface starts from the open-source Studio Admin shell (MIT) and was restyled with
MaintainX as the visual reference: neutral surfaces, one blue accent and dense, readable tables.
On phones the dashboard follows Apple's Human Interface Guidelines: a top bar with the sidebar
button, a wide search field and the notifications bell; a bottom tab bar per role; tables become
cards; filters and dialogs open as bottom sheets.

# 5. Backend technologies used

| Technology | Use in ZEGA |
| --- | --- |
| **Hono** with **@hono/zod-openapi**, mounted at `/api` inside Next.js | REST API. Each route is declared with Zod schemas that both validate requests and produce the OpenAPI 3.1 document |
| **Better Auth** | Email and password sign-in, scrypt hashing, database sessions, session list and revoke, admin plugin, JWT plugin for API clients, rate limiting |
| **Drizzle ORM** | Typed queries and schema, SQL migrations |
| **Server-Sent Events** over PostgreSQL `LISTEN/NOTIFY` | Real-time status updates and notifications |
| **Resend** + **React Email** | Email notifications, sent only after the database transaction commits |
| **Vercel Blob** | Photo storage (local folder in development) |
| **@react-pdf/renderer** | PDF reports; CSV is streamed |
| **Scalar** and **Swagger UI** | Interactive API documentation at `/api/docs` and `/api/docs/swagger` |
| **RFC 9457 Problem Details** | One error format for every failure, with field errors and a request id |

## 5.1 Architecture

```mermaid
flowchart LR
  subgraph Client["Browser or installed app"]
    UI["React 19 UI<br/>TanStack Query, nuqs"]
    ES["EventSource<br/>live updates"]
  end
  subgraph Vercel["Vercel (Next.js 16)"]
    RSC["Server Components"]
    API["Hono REST API /api"]
    AUTH["Better Auth /api/auth"]
    SSE["SSE /api/events"]
    SVC["Services"]
    CRON["Cron maintenance"]
  end
  PG[("Neon PostgreSQL")]
  BLOB[("Vercel Blob")]
  MAIL["Resend"]
  UI --> API
  UI --> AUTH
  ES --> SSE
  RSC --> SVC
  API --> SVC
  CRON --> SVC
  SVC --> PG
  AUTH --> PG
  SSE -- "LISTEN" --> PG
  SVC --> BLOB
  SVC -- "after commit" --> MAIL
```

The code is layered. `src/domain` holds pure business rules with no input or output: the request
state machine, SLA calculations and the role to permission map. `src/server/services` holds the
business operations (create, transition, assign, report, audit) and is used both by the API and
by server components, so both paths apply the same rules. `src/server/api` adds authentication,
validation, permission guards and error handling. The API receives its dependencies (database,
authenticator, storage, event bus) through `createApi()`, which is what allows the tests to run the
real API against an in-memory PostgreSQL.

## 5.2 Request lifecycle

The lifecycle is defined once in `src/domain/request-machine.ts`. The API rejects any other
transition with `409 Conflict`, and the interface only shows the actions the current user may take.

```mermaid
stateDiagram-v2
  [*] --> submitted
  submitted --> triaged: admin
  submitted --> assigned: admin assigns
  triaged --> assigned: admin assigns
  assigned --> in_progress: officer starts
  assigned --> on_hold: officer (note)
  in_progress --> on_hold: officer (note)
  on_hold --> in_progress: officer resumes
  in_progress --> resolved: officer (note)
  resolved --> closed: requester confirms
  resolved --> closed: system after 72 h
  resolved --> reopened: requester (note)
  reopened --> assigned: admin
  reopened --> in_progress: officer
  submitted --> rejected: admin (note)
  triaged --> rejected: admin (note)
  submitted --> cancelled
  assigned --> cancelled
  closed --> [*]
  rejected --> [*]
  cancelled --> [*]
```

## 5.3 Security

| Concern | Measure |
| --- | --- |
| Passwords | scrypt hashing; minimum length with letters and digits enforced by Zod |
| Sessions | Database sessions in httpOnly, SameSite cookies; 7 days, refreshed daily; users can list and sign out devices; a role change or deactivation ends all sessions |
| API clients | Short-lived EdDSA JWT from `GET /api/auth/token`, public keys at `/api/auth/jwks` |
| Authorisation | Every route checks a permission from `src/domain/permissions.ts`; services also check ownership. Requesters only see their own requests and officers only their assigned ones; hidden requests return `404`, not `403` |
| Abuse | Rate limiting stored in the database; upload size and count limits; image type checked from the file bytes |
| Headers | Content Security Policy, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies |
| Logging | Structured JSON logs with security events (denied access, role changes, deactivations) and a request id that also appears in error responses |

# 6. Database and relationship types

ZEGA uses **PostgreSQL** (hosted on **Neon**), a relational database, accessed through Drizzle ORM.
The schema has 23 tables. The six entities required by the brief map directly to tables:

| Required entity | Table | Notes |
| --- | --- | --- |
| Users | `users` | Better Auth user table extended with role, department, matric or staff number, phone and preferences |
| Roles | `roles`, `permissions`, `role_permissions` | Four system roles: student, staff, officer, admin |
| Service requests | `service_requests` | Reference `ZG-YY-NNNNNN` from a sequence; SLA due dates; full-text search column; soft delete |
| Request categories | `request_categories`, `sla_policies` | Seven categories; response and resolution targets per category and priority |
| Assignments | `assignments` | One row per assignment period, so reassignments keep their history |
| Status updates / logs | `status_logs` | Every status change with actor, note and time; the request timeline |

Supporting tables: `locations` (campus tree), `officer_specialties`, `comments`, `attachments`,
`request_votes`, `ratings`, `notifications`, `audit_logs`, `system_jobs` and Better Auth's
`sessions`, `accounts`, `verifications`, `jwks` and `rate_limits`.

```mermaid
erDiagram
  roles ||--o{ users : has
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : "granted by"
  users ||--o{ sessions : "signs in"
  users ||--o{ officer_specialties : officer
  request_categories ||--o{ officer_specialties : "covered by"
  request_categories ||--o{ sla_policies : targets
  request_categories ||--o{ service_requests : classifies
  locations ||--o{ locations : contains
  locations ||--o{ service_requests : where
  users ||--o{ service_requests : reports
  users |o--o{ service_requests : "assigned to"
  service_requests ||--o{ assignments : history
  users ||--o{ assignments : officer
  service_requests ||--o{ status_logs : timeline
  service_requests ||--o{ comments : discussion
  service_requests ||--o{ attachments : photos
  service_requests ||--o{ request_votes : "me too"
  service_requests ||--o| ratings : rated
  users ||--o{ notifications : receives
```

## 6.1 Relationship types supported

| Type | Example in ZEGA |
| --- | --- |
| One to one | A request has at most one rating (the rating's primary key is the request id) |
| One to many | A user reports many requests; a request has many status logs, comments and photos |
| Many to many | Roles and permissions (`role_permissions`); officers and categories (`officer_specialties`); users voting on requests (`request_votes`) |
| Self-referencing | `locations.parent_id` builds Campus, Building or Hostel, Floor, Room |
| Optional (nullable) | A request's current assignee is empty until it is assigned |
| History | `assignments` and `status_logs` keep every past state instead of overwriting it |

## 6.2 PostgreSQL features used

- **Enums** for status, priority, attachment kind, location kind and audit action.
- **`ltree`** paths on locations, kept up to date by triggers, so "everything in Amina Hall" is one
  indexed query.
- **Full-text search** with a generated `tsvector` column and a GIN index.
- **Trigram similarity** (`pg_trgm`) to find possible duplicates while a user types a title.
- **Keyset pagination** on `(created_at, id)` with a matching index.
- **Check constraints** (for example a rating between 1 and 5).
- **Triggers** for the audit trail and for `LISTEN/NOTIFY` live events.
- **Hash-chained audit trail.** A trigger writes every insert, update and delete on business tables
  to `audit_logs` with the acting user and a JSON diff. Each row stores
  `sha256(previous hash | row)`, and further triggers block `UPDATE`, `DELETE` and `TRUNCATE` on the
  table. `audit_verify_chain()` recomputes the chain and reports the first broken link.

Migrations are SQL files in `drizzle/`, applied automatically before every production build.

# 7. API documentation

The backend is a REST API under `/api`. The OpenAPI 3.1 document is generated from the same Zod
schemas that validate each request, so the documentation cannot drift from the code.

- Interactive reference (Scalar): <https://zega-ms.vercel.app/api/docs>
- Swagger UI: <https://zega-ms.vercel.app/api/docs/swagger>
- OpenAPI document: <https://zega-ms.vercel.app/api/openapi.json>
- Postman collection: `docs/api/zega.postman_collection.json` (generated by `npm run docs:api`)

**Authentication.** Browser clients use the session cookie set by `POST /api/auth/sign-in/email`.
Other clients can request a short-lived JWT from `GET /api/auth/token` and send it as
`Authorization: Bearer <token>`.

**Errors** use RFC 9457 Problem Details (`application/problem+json`):

```json
{
  "type": "https://zega.app/problems/validation-failed",
  "title": "Validation failed",
  "status": 422,
  "detail": "Request validation failed.",
  "instance": "/api/requests",
  "requestId": "6f1c2d0e-3a9b-4b7e-9d1a-0c5f2e8b7a41",
  "errors": [{ "path": "title", "message": "Too small: expected string to have >=5 characters" }]
}
```

| Status | Meaning |
| --- | --- |
| 400 / 422 | Malformed request or failed validation (with field errors) |
| 401 | Not signed in |
| 403 | Signed in but not allowed |
| 404 | Not found, or not visible to this user |
| 409 | Not allowed in the current state (for example an invalid status transition) |
| 429 | Too many requests |

**Pagination.** List endpoints return `{ data, pageInfo: { nextCursor, total, limit } }` and accept
`limit` and `cursor`. Filters include `q` (full-text search), `status`, `priority`, `category`,
`location` (includes sub-locations), `assignee`, `sla` (breached or at risk), `open`, `from`, `to`
and `sort`.

## 7.1 Endpoints

<!-- API_TABLE -->

# 8. Screenshots of major interfaces

The screenshots below were captured automatically from the running application with seeded data
(`npm run screenshots`), on a 1440 by 900 desktop and on an iPhone 14 sized phone.

<!-- SCREENSHOTS -->

# 9. Testing evidence

Testing covers every layer, and the brief's two requirements are met directly: major frontend
components are tested with Testing Library, and every backend API route is tested in process
against a real PostgreSQL database.

| Level | Tools | What is tested |
| --- | --- | --- |
| Unit | Vitest | State machine (every transition for every role), SLA maths, permissions, validation schemas, helpers |
| API and database | Vitest, Hono `app.request()`, PGlite (PostgreSQL compiled to WebAssembly) with the real migrations, triggers and seed | Authentication, role denials (401, 403, 404), validation (422), CRUD, assignment and suggestions, transitions (409 on invalid moves), comments, votes, ratings, exports, notifications, live events, retention purge and the audit hash chain |
| Components | Vitest, Testing Library, MSW (mocked API), jsdom | Login and register forms, report wizard, actions panel, timeline, work board, notification bell, users manager (including confirmation dialogs), category settings, audit viewer, avatars |
| End to end | Playwright on desktop Chrome and a Pixel 7 phone profile | Full lifecycle across roles, admin tools, guided report with photo, live updates, sign-in redirects, role restrictions and mobile navigation |

<!-- TEST_EVIDENCE -->

Continuous integration (GitHub Actions) runs lint, type checking, the tests with coverage
thresholds and a production build on every push, then the Playwright suite.

# 10. Deployment information

| Item | Value |
| --- | --- |
| Production URL | <https://zega-ms.vercel.app> |
| API reference | <https://zega-ms.vercel.app/api/docs> |
| Health check | <https://zega-ms.vercel.app/api/health> |
| Hosting | Vercel (Next.js application and API, region `iad1`) |
| Database | Neon serverless PostgreSQL (`us-east-2`), pooled connection for queries and a direct connection for migrations and `LISTEN/NOTIFY` |
| File storage | Vercel Blob |
| Email | Resend |
| Scheduled work | Vercel Cron runs the maintenance sweep daily; active live connections also trigger it at most every five minutes |

**Database connection evidence.** `GET /api/health` runs a query against the production database
and reports the result:

<!-- HEALTH -->

**Deployment process.** `vercel --prod` uploads the project; the build runs `npm run db:migrate`
(already-applied migrations are skipped) and then `next build`. Environment variables
(`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `CRON_SECRET`,
`NEXT_PUBLIC_APP_URL`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`) are stored in Vercel, never in the
code. The step-by-step guide is in `docs/DEPLOYMENT.md`.

**Demo accounts** (password `Zega@2026!` for all; the login page also has one-click buttons):

| Role | Email |
| --- | --- |
| Administrator | `admin@zega.test` |
| Maintenance officer | `officer@zega.test` |
| Staff | `staff@zega.test` |
| Student | `student@zega.test` |

The seed creates 48 users, 66 locations across the campus and 160 requests spread over recent
months, so dashboards and reports show realistic data.

# 11. Challenges encountered and solutions

| Challenge | Solution |
| --- | --- |
| **Real-time updates on serverless hosting.** Vercel functions are short-lived and WebSockets are not available, and adding a hosted push service would add cost and another dependency. | Server-Sent Events over a streaming route. PostgreSQL triggers call `pg_notify`, one `LISTEN` connection per server instance fans events out to the users allowed to see them, and the browser reconnects automatically and refetches what changed. |
| **Keeping API documentation accurate.** Hand-written Swagger files drift from the code. | Routes are declared with `@hono/zod-openapi`; the same Zod schema validates the request and generates the OpenAPI document, Swagger UI and Postman collection. |
| **A race in the audit hash chain.** Under concurrent writes two transactions could take audit ids in one order and the chain lock in the other, breaking verification. A dedicated script reproduced it. | Migration `0004` assigns the id while holding an advisory lock, so ids and hashes are always in the same order. The verification function and tests confirm the chain. |
| **Testing against a real database without Docker.** Mocked databases would not exercise triggers, `ltree`, full-text search or the audit chain. | PGlite runs PostgreSQL in process. Each API test file builds a fresh database from the real migrations and seed in seconds. |
| **Unreliable connections to the database from the development network.** Neon's default connection timeout was too short on a slow link and caused intermittent failures. | A small helper relaxes the connect timeout for scripts and the development server, and migrations use the direct connection. |
| **One lifecycle, many places.** Status rules were needed in the API, the request page, the work board and the tests. | A single typed state machine in `src/domain` is imported by all of them, so the UI never offers a move the API would reject. |
| **Drag and drop in automated tests.** The board's pointer sensor ignores instant synthetic drags, and long columns pushed drop targets off screen. | The end-to-end test moves the pointer gradually and clamps the drop point inside the visible column. Phones get a Move menu instead of dragging. |
| **A strict Content Security Policy versus third-party documentation.** The API reference loads scripts and fonts from a CDN. | A strict policy for the application and a separate, relaxed policy only for `/api/docs`. |
| **Mobile usability.** Wide admin tables and multi-column boards do not fit a phone. | Tables render as cards below 768px, filters and dialogs become bottom sheets, the board becomes a status switcher, and a bottom tab bar gives each role its main destinations. |
| **Large media on the landing page.** The original background video was 60 MB. | It was re-encoded to 1.8 MB and loads only when scrolled into view; images are served in modern formats by Next.js. |

# 12. Conclusion

ZEGA meets every requirement of the brief. The frontend provides registration and login,
dashboards for each role, a guided submission form, a tracking page and an administrator
request management interface, with validation and feedback throughout. The backend provides
authentication and authorisation, a documented REST API with full CRUD for requests, role-based
access control, assignment to officers, consistent error handling and secure password and session
handling. The PostgreSQL database contains all six required entities and demonstrates one to one,
one to many, many to many and self-referencing relationships.

All nine advanced features in section D were implemented, against a minimum of four:

| Advanced feature | Implementation |
| --- | --- |
| JWT and session authentication | Database sessions in httpOnly cookies, plus short-lived JWTs for API clients |
| Role-based access control | Permission map shared by API guards, services and navigation |
| File and image upload | Up to five photos per report (3 MB each), compressed and stripped of EXIF in the browser; officers add before and after photos |
| Email and in-app notifications | Notification bell and page, emails through Resend, per-user preference |
| Search, filter and pagination | Full-text search, faceted filters stored in the URL, keyset pagination |
| Real-time status updates | Server-Sent Events driven by PostgreSQL `LISTEN/NOTIFY` |
| Audit trail | Trigger-based, hash-chained and verifiable from the interface |
| API documentation | OpenAPI 3.1 with Scalar, Swagger UI and a Postman collection |
| PDF and CSV export | Summary reports as PDF; any filtered request list as CSV |

The application is tested at the unit, API, component and end-to-end levels, and is deployed on
Vercel with a Neon PostgreSQL database, as the health check above shows.

Future work would add a separate production database branch with longer backup retention, push
notifications for the installed app, and integration with the university's single sign-on.
