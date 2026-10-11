# Mobile platform hardening roadmap

Status: planning document for the existing Expo/React Native MVP. This is not a statement of production readiness.

## Current boundary
- The client is built with Expo/React Native and calls a standalone Express API.
- The backend stores demo data in SQLite and optionally replicates append-only inquiries.
- Public `EXPO_PUBLIC_*` values are bundled into the application; they must never contain secrets.
- The current README says authentication, admin controls, retention/deletion, and production deployment are incomplete.

## Priority 0 — before real customer data
- [ ] Implement authenticated sessions and server-side tenant/role authorization; do not trust client-side route guards.
- [ ] Keep all service credentials and peer-sync secrets off the device bundle and out of logs.
- [ ] Use HTTPS for non-local APIs; document certificate and environment configuration.
- [ ] Define privacy notice/consent, data minimization, retention, and logout/session-revocation behavior.
- [ ] Review local device storage, clipboard/share behavior, screenshots, and sensitive data exposure.
- [ ] Add request throttling and abuse controls at the API boundary.
- [ ] Document backup/restore for the backend; device-side caching must not be treated as the system of record.

## Priority 1 — mobile reliability
- [ ] Add explicit offline, reconnecting, retry, timeout, and server-conflict UI states.
- [ ] Use an idempotency key for user-submitted RFQs to prevent duplicate submissions on retry.
- [ ] Test API compatibility on Android and iOS simulators plus representative physical devices.
- [ ] Add accessibility labels, scalable text, touch-target checks, and localization-ready strings.
- [ ] Test lifecycle transitions, app backgrounding, interrupted uploads, and expired sessions.
- [ ] Define minimum supported OS versions and Expo SDK upgrade policy.

## Priority 2 — delivery
- [ ] Run unit/API tests, TypeScript checks, Expo dependency checks, and platform bundle/export checks in CI.
- [ ] Add dependency and secret scanning, with a documented triage process.
- [ ] Establish signed build/release artifacts and store signing credentials only in protected CI secrets.
- [ ] Publish staged internal builds first; production release requires human approval and rollback instructions.

## Release gates
Do not put real customer records in the app until authentication, API authorization, data-retention decisions, secure transport, and privacy review are complete. A successful Android bundle export is a compatibility check, not proof of iOS or production readiness.
