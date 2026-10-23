# Backend release — 2026-10-23

The user authorized the migration and deployment. The mobile app uses the existing Lonagram Supabase project and https://lonagram.com.

## Released

- Vercel project: `prj_B1TM24L8nx6m2lL30Pdl4r6T1xOO`, team `team_AyKL8v4Zrce5keZYR427z5PV`.
- Deployment: `dpl_2iD6bAPTQ3jee6NByubQouP2LykT`.
- Deployment URL: https://lonagram-dpa9nj92g-yerlansandybaevs-projects.vercel.app
- Inspector: https://vercel.com/yerlansandybaevs-projects/lonagram/2iD6bAPTQ3jee6NByubQouP2LykT
- Production: https://lonagram.com
- Source: web base `59897a129c065e274a1d2c75db2ee683e982beb0` plus the local backend patch. The two newer web commits were preserved before release.
- Source was uploaded through the authenticated Vercel CLI and staged with production settings before promotion. The release initially used local source. Integration source is now maintained on the web repository branch `codex/mobile-backend-integration` and packaged in `backend-integration.patch`; a future deployment from main needs that branch merged first.

## Database migration

Migration `20261023052502`, `mobile_request_idempotency`, was applied to the existing Supabase project `tuuancbntarycnodwmpb`. A preflight verified that neither the table nor migration record existed. The migration and its history entry were committed together in one transaction, with a 5-second lock timeout and 20-second statement timeout.

The migration creates only `public.mobile_requests`, enables RLS, denies client grants, and permits the server role. Existing production accounts, profiles, conversations, and messages were not modified for testing.

Verified from Postgres after application:

| Check | Result |
| --- | --- |
| RLS enabled | true |
| anon SELECT privilege | false |
| authenticated SELECT privilege | false |
| service_role SELECT/INSERT/UPDATE/DELETE privilege | true |
| Migration history recorded | true |

The generated migration file retains its original draft header as part of the exact SQL recorded in migration history; this release note records its applied status.

## Verification

- Web lint and TypeScript passed; all 141 tests passed on the refreshed web source, including 11 isolated adapter tests.
- The Vercel production build completed successfully.
- Staged adapter: missing and invalid bearer tokens both returned 401; health returned 200.
- After promotion, `https://lonagram.com/api/health` returned 200 with `lonagram-web`; `/sign-in` returned 200; `/api/mobile/v1` returned 401 JSON for both missing and invalid bearer tokens.
- Public Data API request for zero ledger rows returned 401 / Postgres code `42501`, confirming that the public key cannot read this table.
- Mobile TypeScript and all 31 tests passed; iOS and Android Hermes exports passed with the existing project's public configuration.
- The user saved `lonagram://auth/callback`, verified alongside the two web redirects. Email and Google providers are enabled.

## Remaining validation

Real-device Google/password sign-in, session restart/refresh, and the signed-in cross-platform journey still need isolated test accounts. No real user was messaged, reported, blocked, or deleted. No store build or publication was performed.

Pending-ledger crash recovery still requires reconciliation; do not automatically delete pending reservations and re-run uncertain operations. Domain effects are not made transactional by the request ledger.

## Rollback

The preceding production deployment was observed at https://lonagram-4qokwh3nc-yerlansandybaevs-projects.vercel.app. Promoting that deployment would restore the prior server build. The additive retry table can remain in place; do not drop it or its records automatically. No rollback was performed.
