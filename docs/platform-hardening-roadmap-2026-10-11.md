# Mobile platform hardening roadmap

**Review date:** 2026-10-11  
**Status:** Planning document for review; not a production-readiness attestation.

## Current shape
- Expo / React Native client and a separate Express + SQLite API.
- Mobile API default port: 4001; Android Emulator and iOS Simulator use different loopback mappings.
- Optional append-only peer replication with the Web and Desktop backends.
- Existing commands documented in the repository: `npm test`, `npm run typecheck`, and Android Expo export as a compatibility check.

## Priority work

### P0 — Before real customer data
- Design sign-in, session lifecycle, role/access checks, and logout/revocation; do not treat a tracking code as sufficient authorization for sensitive records.
- Keep service credentials out of `EXPO_PUBLIC_*`, app config, source maps, crash reports, and logs.
- Require TLS for non-local API and peer traffic; document certificate, proxy, and environment configuration.
- Define privacy notice, collection minimization, retention/deletion, local device data handling, and incident response.
- Review network failure, timeout, duplicate submission, and retry behavior so the UI does not mislead users about saved or synchronized inquiries.
- Add device-accessible-state, screen-reader, touch-target, and offline/error-state checks.

### P1 — Quality and security
- CI should run tests, TypeScript checks, Expo export for supported targets, dependency scanning, and secret scanning.
- Test API URL configuration on Android emulator, iOS simulator, and physical devices without embedding secrets.
- Verify sync-disabled behavior, unauthorized sync requests, replay idempotency, payload conflicts, and outbox retry behavior.
- Establish supported OS/Expo versions and a dependency update process.

### P2 — Release readiness
- Document signing credentials and store release workflow using protected secrets and human approval.
- Add crash/diagnostic reporting only with privacy review and redaction.
- Define release rollback, support, backup/restore responsibilities for the server API, and version compatibility with Web/Desktop.
- Validate accessibility and privacy behavior on representative devices. No app-store release is performed by this document.

## Acceptance checklist
- [ ] Authentication and API authorization are implemented and tested.
- [ ] No secrets are present in the client bundle or logs.
- [ ] Network and offline/retry flows are tested on supported targets.
- [ ] Accessibility and privacy review is documented.
- [ ] CI passes and a human reviewer approves release readiness.

## Guardrail
This roadmap does not certify the application as secure or production-ready. Until P0 items are implemented and verified, use synthetic/demo data only.
