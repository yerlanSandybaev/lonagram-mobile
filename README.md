# Lonagram mobile

Expo 57 / React Native client for iOS and Android using Lonagram's existing Supabase project and web domain services. No separate database, user system, or model provider lives in this app.

Start with [the integration map and verification notes](docs/INTEGRATION.md). The server changes are prepared locally in the sibling `lonagram-web-reference` checkout and included as [a reviewable backend patch](docs/backend-integration.patch). The adapter and retry migration were released to the existing production backend on 2026-10-23; see [release verification](docs/RELEASE.md). Integration source is maintained on `codex/mobile-foundation` in the mobile repository and `codex/mobile-backend-integration` in the web repository.

## Local configuration

Run `npm ci`, then copy `.env.example` to `.env.local` and configure:

- `EXPO_PUBLIC_SUPABASE_URL`: the same project URL as the website.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: that project's public publishable key. `EXPO_PUBLIC_SUPABASE_ANON_KEY` is accepted for a legacy anon key.
- `EXPO_PUBLIC_LONAGRAM_API_URL`: the existing web origin serving the reviewed `POST /api/mobile/v1` adapter.

Never put `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, or `LONAGRAM_API_SECRET` in this repository's mobile environment. Public Expo values are bundled into the app. Invalid/private key types are rejected, but that cannot remove an accidentally embedded secret from an already built bundle.

Google sign-in uses the existing Supabase Google provider and PKCE. Allowlist `lonagram://auth/callback` in the same Supabase Auth project. Test the custom scheme in an installed development/standalone build; Expo Go does not own the `lonagram` scheme. No Google client secret belongs in the mobile app. See [Supabase mobile redirects](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

API origins must use HTTPS, except localhost for local testing. Use an HTTPS tunnel to a local web adapter for a physical phone. Restart Metro after changing `.env.local`. Browser preview is not a substitute for native authentication testing: session persistence uses the device secure store.

## Run and check

```sh
npm run check
npm start
npm run android
```

Local iOS Simulator execution requires macOS and Xcode (`npm run ios`). Windows can produce both platforms' JavaScript/Hermes bundles:

```sh
npx expo export --platform ios --platform android --output-dir dist --max-workers 2
```

These are bundle checks, not signed IPA/APK builds. No EAS project, signing credentials, store submission, or deployment has been created.

## Implemented client flows

- Email auth, secure persisted sessions, foreground refresh, logout, and Google PKCE callbacks.
- Shared-profile onboarding with explicit 18+ confirmation and optional Twin publication.
- Dating as the first tab, preferences, private likes, Twin entry, and connection invitations.
- Separate Twin and Personal conversations, guarded sends, retained in-memory drafts, and retry keys.
- Server-generated unread counts, grouped notification reads, and known web-to-mobile notification links.
- Profile/photo editing, Twin settings and permissions, blocking/unblocking, reports, and typed account deletion confirmation.

Business operations require the web adapter. The client does not fall back to direct table writes or call Render's private `/rpc`. If the backend is unavailable, the app shows an error and keeps chat drafts. Drafts are cleared on logout/account changes and are not saved across process termination.

The backend migration was applied, with user authorization, to the existing Supabase project on 2026-10-23. It provides private request tracking; guarded sends refuse to run if that storage is unavailable. An interrupted request remains pending for reconciliation; it is never silently executed twice.
