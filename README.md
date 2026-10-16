# Lonagram mobile

Native iOS and Android client for [Lonagram](https://lonagram.com). The current milestone provides secure Supabase authentication and a polished five-tab product shell. It does not replace the website or backend.

The website remains the Next.js app in [yerlanSandybaev/lonagram](https://github.com/yerlanSandybaev/lonagram). This repository does not import that app, and it does not ship server secrets.

## Architecture

The phone is another Supabase client. Signup sends the same user metadata the existing `handle_new_user` trigger already reads: `username`, `display_name`, and `is_18_plus`. The session is encrypted by the platform secure store (iOS Keychain, Android Keystore). Values larger than the store's limit are split into chunks so a full auth session still fits.

These values stay on the server and are not part of this app:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SESSION_SECRET`
- `LONAGRAM_API_SECRET`

Twin turns, permission filtering, and cross-user reads stay behind the existing Next.js actions and the Render API. The Render `/rpc` route is an internal API protected by a shared secret. The app does not call it.

Pure signup rules that must match the website live in `src/lib/auth-input.ts` and are covered by Vitest. Moving `src/domain` out of the website into a shared package would mean restructuring the production app. That wait is intentional for this phase.

## Configure

```bash
npm install
copy .env.example .env.local
```

Set the two public values from the same Supabase project the website uses (Project Settings → API):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY` is accepted as an alias for the website's public anon key. If the value is a service-role or secret key, the app refuses to create a client. Restart Expo after changing `.env.local`.

Leave both values empty to open the sign-in screen without a project. Sign-in will not succeed until they are set.

## Checks

```bash
npm run typecheck
npm test
```

## Android

1. Install [Android Studio](https://developer.android.com/studio) and an Android emulator, or use a phone with [Expo Go](https://expo.dev/go).
2. Start the emulator, or connect the phone with USB debugging enabled.
3. From this directory:

```bash
npm run android
```

That starts Metro and opens the app on the emulator or connected device. You can also run `npm start` and press `a`.

On a physical phone with Expo Go, `npm start` prints a QR code. The phone and the computer need to be on the same network. If the phone cannot reach Metro, run `npx expo start --tunnel`.

## iOS

A local iOS Simulator build needs macOS and Xcode. On a Mac:

```bash
npm run ios
```

From Windows, install Expo Go on an iPhone, run `npm start`, and scan the QR code. The phone and the computer need to be on the same network, or use `npx expo start --tunnel`.

This phase does not create an App Store or Play Store submission, an EAS production build, or a development-build binary. `com.lonagram.app` is the local bundle identifier for later device builds.

## What you can do in this version

- Create an account with email, password, username, display name, and the 18+ confirmation.
- Sign in and stay signed in after the app restarts.
- Move through Discover, Connections, Twin, Chats, and Profile, and open Notifications and Settings.
- Sign out from Settings.

The mobile product now includes:

- Home, Discover, Messages, Notifications, and Profile navigation
- Profile editing with resized photo selection, interests, languages, and intentions
- The five core Twin behavior questions, publish/unpublish, and field-level permissions
- Live discovery profiles and shared interests from Supabase
- Connection invitations with accept, decline, and ignore controls
- Private human messaging after an accepted connection
- Notifications, blocking, and reporting
- Full-screen, keyboard-safe human and Twin chat layouts

The app never fills unavailable services with fake content. The existing AI turn route authenticates with a Next.js web-session cookie; mobile Twin turns and Twin Signals remain visibly disabled until that server route accepts and verifies a Supabase bearer token. Twin Signal eligibility is still enforced in the UI: the owner Twin must be published and Twin chat permission enabled.

## EAS profiles

`eas.json` includes development, internal preview, and production profiles. Building still requires an Expo account, an EAS project link, and the relevant Apple or Google credentials:

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
```

No store submission is performed by this repository configuration alone.

Google sign-in is not in this version. The website shows it only when Supabase Google auth is configured, and the native redirect still needs to be registered on that project.
