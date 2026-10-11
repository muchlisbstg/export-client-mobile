# Mobile platform readiness review — 2026-10-11

## Current scope
This repository contains an Expo/React Native client and a separate Express + SQLite API. Public `EXPO_PUBLIC_*` values are embedded in the app bundle and must not contain credentials or shared secrets.

## Readiness checklist
- [ ] Run `npm ci`, `npm test`, `npm run typecheck`, and `npx expo export --platform android`.
- [ ] Run the interoperability suite against the matching Web and Desktop revisions.
- [ ] Verify Android/iOS production builds use HTTPS endpoints and environment-specific API URLs.
- [ ] Check device loss, session expiry, API timeout, offline behavior, retry safety, and duplicate RFQ submission.
- [ ] Ensure secrets remain on the server; rotate any secret that has ever been bundled into a client.
- [ ] Document privacy notice, data retention, account/session lifecycle, logging limits, and support procedures before real-customer use.

## Peer synchronization risks
The sync protocol is append-only; conflicts are recorded rather than automatically merged. Validate stable node IDs, secret rotation, retry/backoff, TLS, and operational alerting across all peers.

## Release gate
An Android export is a compatibility check, not proof of store readiness, security, or regulatory compliance. This note is a checklist, not a certification. Do not use real customer data until security and privacy controls have been reviewed.
