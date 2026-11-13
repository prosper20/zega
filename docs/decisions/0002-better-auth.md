# 0002. Better Auth for sessions, roles and JWT

Date: 2026-11-12 · Status: Accepted

## Context

The brief requires secure password handling and session management, and lists JWT or session
authentication as an advanced feature. Rolling our own auth is risky. Auth.js is oriented to OAuth
and makes credential sessions awkward; hosted providers (Clerk, Auth0) move user data off our
database and make role logic harder to audit.

## Decision

Use Better Auth with the Drizzle adapter on our own `users`, `sessions` and `accounts` tables:
email and password with scrypt, database sessions in httpOnly cookies (7 days, refreshed daily), the
admin plugin (roles, deactivation), the JWT plugin for API clients (EdDSA, 15 minutes, JWKS
endpoint), and rate limiting stored in Postgres so it works across serverless instances.

Roles live in our own `roles`/`permissions` tables; `src/domain/permissions.ts` maps roles to
permissions and is used by API guards and the UI.

## Consequences

- Sessions are revocable (profile page lists devices; role change or deactivation ends them), which
  stateless JWTs alone cannot offer.
- Both session cookies and Bearer tokens are supported, so Postman and scripts work.
- User data stays in our database and is covered by the audit trail.
