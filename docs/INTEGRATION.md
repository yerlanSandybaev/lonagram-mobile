# Integration map and handoff

## 1. Existing mobile stack and screens (inspection before changes)

The repository default branch was `codex/mobile-foundation`. Expo 57.0.27, React Native 0.86.3, React 19.2.3, Expo Router, React Query, Supabase JS 2.117.3, SecureStore, image picker/manipulator, and EAS profile declarations were already present. There were no mobile `AGENTS.md` files. The web repository's root instructions require reading the installed Next.js route documentation; that was read before writing its adapter.

Existing screens: password sign-in/signup, Home, Discover, Messages, Notifications, Profile, profile editor, Twin editor, permissions, connection list, human chat, and a disabled Twin-chat placeholder. Session storage already split large encrypted sessions into SecureStore-sized chunks. Native lifecycle refresh was partially wired.

Baseline verification: TypeScript and 13 tests passed. Existing live behavior could not be confirmed without local configuration. The presence of screens and table calls did not establish that the integration worked.

## 2. Existing backend resources and endpoints

Source inspected: `yerlanSandybaev/lonagram`, cloned locally as `../lonagram-web-reference`.

The same Supabase project contains profiles/avatar data, user interests, Twin profiles/permissions/examples, Dating preferences/likes, Twin conversations/participants/generated and personal messages, connection requests/connections, direct conversations/messages, notifications, blocks, and reports. The auth trigger creates account-related rows for a Supabase user. No new user/profile/message system is proposed.

Previously usable mobile interfaces: Supabase Auth, plus own-profile reads with a user JWT. The old mobile app also wrote tables directly, but those calls skipped domain behavior; notably, acceptance created connections in the app, sends skipped message safety/notifications, and read calls skipped notification grouping.

Existing web HTTP routes such as `/api/twin/[id]/turn`, `/api/unread`, feedback, and account export use `getActorId()` with browser cookies. Next.js Server Actions handle onboarding, Dating, connections, safety, and deletion. The Render `/rpc` uses `x-lonagram-secret` and is internal. Mobile must never call it or receive its secret. The inspected legacy remote service method list also omits Dating methods; the new adapter uses the existing direct Supabase domain runtime and does not depend on that fallback.

## 3. Authentication and session flow

Password and Google sign-in both use the existing Supabase Auth project. Google uses PKCE with `lonagram://auth/callback`; the browser result and callback route share one code-exchange promise to avoid consuming the code twice. Cold callbacks are routed explicitly. The callback rejects unexpected schemes/hosts/paths. No OAuth provider secret is stored in the app.

Native sessions remain in device SecureStore. Auto-refresh starts when the app is active and pauses in the background. Restore errors end the splash state, and stale initialization results cannot overwrite a newer auth event. Query caches and draft stores belong to one signed-in account and are recreated on account changes. Logout checks the Supabase result instead of pretending success.

Every domain request obtains the current access token and sends `Authorization: Bearer ...`, with cookies omitted and HTTP redirects rejected. Tokens/refresh tokens are never included in domain request bodies. An actor ID is not sent as authorization. Target user IDs and conversation IDs remain legitimate resource selectors; the server authorizes them through the existing services.

The server verifies the token through `auth.getUser(token)` against the configured existing project, derives the actor, validates a strict allowlist, and calls domain services. It refuses demo fallback or missing server configuration. This requires the web server's existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; they stay server-side.

## 4. Authenticated HTTP contract and local backend changes

`POST /api/mobile/v1`, JSON `{ "operation": "...", "input": { ... } }`.

Responses: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": "...", "code": "..." }`. All responses are private/no-store. Validation failures are 400, invalid auth 401, authorization/block failures 403, missing resources 404, pending/conflicting request keys 409, limits 429, and unavailable infrastructure 503. Body input is bounded at 250 KB. Cookie-only authentication, arbitrary RPC method names, and caller-supplied actor fields are rejected.

| Operation | Input | Existing domain service |
| --- | --- | --- |
| `settings.get` | `{}` | `getSettings` (own bundle/blocks) |
| `home.get` | `{}` | `getHome` (incoming/outgoing requests) |
| `onboarding.complete` | Existing onboarding schema; optional explicit `adultConfirmation: true` | `completeOnboarding` |
| `profile.update` | `{profile, interests}` | Merge into current settings, then `completeOnboarding` |
| `twin.update` | `{twin}` (editable fields and enabled) | Merge current settings, `completeOnboarding`, `setTwinEnabled` |
| `permissions.update` | `{permissions}` (known fields) | Merge current permissions, `updatePermissions` |
| `dating.get` / `dating.discover` | `{}` | `getDating` / `discover` with `filter: dating`, limit 24 |
| `dating.update` | `{preferences}` | `saveDatingPreferences` |
| `dating.like` | `{otherId}` | `likeDatingProfile` |
| `twin.start` | `{otherId}` | `startTwinConversation` |
| `twin.get` / `twin.list` | `{conversationId}` / `{}` | `getTwinThread` / `listTwinThreads` |
| `twin.turn` | `{conversationId, cue}` | `runTurn` |
| `twin.inbox` | `{conversationId, lastSeenId}` | `updateTwinInbox` |
| `connection.request` | `{otherId, source, twinId?}` | `requestConnection`; Twin Signal is deliberately not exposed |
| `connection.respond` | `{requestId, decision}` | `respondConnection` |
| `messages.list` / `messages.get` | `{}` / `{conversationId}` | `listDirectThreads` / `getDirectThread` (marks read) |
| `messages.send` | `{conversationId, body}` | `sendDirectMessage` |
| `notifications.list` | `{}` | `listNotifications` (grouped) |
| `notifications.read` / `notifications.readAll` | `{id}` / `{}` | Group-aware read services |
| `unread.get` | `{}` | `counts` |
| `safety.block` / `safety.unblock` | `{otherId}` | `blockUser` / `unblockUser` |
| `safety.report` | Existing report schema | `report` |
| `account.delete` | `{username}` | Confirm own username, revoke sessions, delete own account |

Twin timeline responses normalize the existing server's personal-line marker and personal-message kind into `body` and `fromPerson`. The mobile UI labels generated content `Twin` and actual user content `Personal`. This does not infer consent from generated text.

Profile and Twin edits load the current settings before merging editable fields, preserving advanced Twin fields, private disclosures, permissions not exposed by the current editor, and publication state. The image picker follows the server's 120 KB decoded-image limit. No new storage bucket is created.

Two small existing-domain fixes accompany the adapter: explicit onboarding adult attestation for OAuth-created profiles (the same kind of confirmation as password signup), and removal of account deletion's unsafe profile-only fallback when Auth deletion fails. The latter now reports failure while preserving the profile. Neither change modifies existing production rows automatically.

### Retry semantics and draft migration

`Idempotency-Key` is required for private likes, Twin start/turn, invitation send/respond, personal message send, and reports. Requests are scoped by verified actor, operation, and key, with a hash of validated input. A unique insert reserves a request before effects run. Concurrent retries return 409 while pending; completed retries replay the prior result. Different content on the same key returns 409. No mutation is automatically retried by the transport.

The generated draft migration `20261023052502_mobile_request_idempotency.sql` adds only private request tracking in the existing project. It enables RLS, grants no client access, and grants access only to the server role. Actor rows cascade on Auth deletion. The migration was subsequently applied with user authorization and recorded in production migration history. Its RLS and grants were verified directly; see RELEASE.md.

The ledger does not make existing multi-step domain services transactional. A crash after side effects but before result persistence leaves a pending request. It must be reconciled against existing records; do not expire it and execute again automatically. This trades automatic recovery for preventing duplicate execution under an uncertain outcome. Request tracking does not deduplicate intentionally different keys.

Account deletion checks the typed username before revoking sessions and removes the account's request records. Auth deletion must actually succeed; the profile-only fallback was removed. Tokens are verified against Auth on each request, so deleting the Auth user also prevents future mobile access. Concurrent in-flight operations and failure recovery still warrant staging tests before release.

## 5. Smallest complete journey and incremental implementation

1. Existing account signs in; secure session restores and refreshes on foreground.
2. New accounts finish shared-profile onboarding, explicitly confirm 18+, and choose whether to publish/allow their Twin.
3. Dating preferences opt into the existing reciprocal matching rules. Discovery uses backend ranking and eligibility.
4. A user opens an available Twin, sends a cue, and explicitly invites the person to connect.
5. Only the recipient can accept; the existing service opens the shared personal conversation.
6. Personal sends use existing safety/authorization rules. Server notifications and read counts are shared across clients.
7. Users can change permissions, report, block/unblock, sign out, or explicitly confirm shared-account deletion.

Client drafts and retry keys survive errors and screen navigation in memory. Sends lock synchronously, retain text until acknowledgement, and show sending/retry feedback. They do not survive killing the process. iOS chat uses the actual navigation header height for keyboard avoidance; Android uses resize mode; the composer and tab bar account for bottom safe areas. Conversation polling runs only on focused chat screens; unread/list refresh is periodic (up to 15 seconds), not push delivery.

## Verification: observed versus pending

Observed locally:

- Baseline mobile TypeScript + 13 tests passed before changes.
- Mobile TypeScript + 31 tests pass, covering key rejection, bearer transport, cookies/redirect policy, expired sessions, network errors, callback validation, routing, draft races, retries, account separation, and request-key lifecycle.
- Web lint/TypeScript and 141 tests pass on the refreshed web source, including 11 new adapter tests using memory-only seed fixtures and synthetic auth verification. No real users were messaged, reported, blocked, or deleted.
- The fixture journey exercises Dating discovery → Twin start/turn → invitation → recipient-only acceptance → personal send → retry replay → unread/read → block. It verifies one stored message on retry and denies an unrelated account's read.
- iOS and Android Hermes bundle export passed. This is not a signed native build or device UI test.
- The web production build includes `/api/mobile/v1`.

Not verified / required before live use:

- Public configuration is now set in the ignored `.env.local`, using the project URL and existing publishable key verified in the signed-in dashboards. The project is `tuuancbntarycnodwmpb`, shared with lonagram.com. Vercel connector access returned 403 and the Supabase connector was not authorized; the existing signed-in browser sessions provided the public configuration. No private key was revealed or copied.
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_LONAGRAM_API_URL=https://lonagram.com` are configured locally. Live read-only checks confirm email and Google providers are enabled, email confirmation is required, `/api/health` returns 200, and unauthenticated Twin turns return 401. `/api/mobile/v1` initially returned 404. After the authorized release it returns 401 JSON for unauthenticated or invalid-token requests, confirming the adapter is deployed.
- The backend patch was refreshed onto web commit `59897a1`, the migration was applied with authorization, and the staged production deployment was verified and promoted. See RELEASE.md. Source changes remain local; future Git deployments must include them.
- Live SQL verified the migration record, RLS, and client/server grants. A zero-row public Data API request was denied. Full signed-in domain-effect tests on isolated staging accounts and SQL-advisor review remain outstanding.
- The user saved `lonagram://auth/callback`; the production dashboard now shows it alongside both existing web callbacks (three URLs total). This was verified after saving. Still test password and Google sign-in on installed iOS/Android builds, callback cancellation and cold starts, email confirmation, app restart, refresh expiry, offline logout, keyboard behavior, photo selection, and deletion failures with isolated accounts.
- Test sharing between web and both native platforms using two explicitly isolated accounts. Verify privacy revocation/blocking, identical-key replay, read grouping, and recovery of pending requests.
- No Android emulator/adb or Docker executable was found on PATH; iOS Simulator is unavailable on Windows. No EAS signing/build service or store publication was invoked.
- Existing dependency installation reported advisories; dependencies were not broadly upgraded. Supabase was pinned to the already locked version. An offline install's audit output does not establish advisories are resolved.

The user authorized the production migration and deployment; both are complete and verified as described in RELEASE.md. No GitHub push, app-store publication, production fixture creation, or production user-data mutation for testing was performed. The user saved the mobile authentication redirect, which was verified in the dashboard.
