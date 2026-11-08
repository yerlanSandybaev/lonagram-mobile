# Sign in with Apple setup

The app code is done: the Apple button shows on iPhones and signs in through Supabase with a nonce-checked identity token. Apple sign-in works only after this one-time setup, and only in an installed development or store build (not Expo Go).

1. **Apple Developer account**: Certificates, Identifiers and Profiles, open the App ID `com.lonagram.app`, enable **Sign In with Apple**. EAS builds pick the capability up from `app.json` (`ios.usesAppleSignIn`), so run `eas build` after enabling it.
2. **Supabase**: Authentication, Providers, Apple, enable it and add `com.lonagram.app` to **Authorized Client IDs**. Native sign-in with an identity token needs only the bundle ID. A Services ID and secret key are needed only for web Apple sign-in.
3. **Test** with a development build on a real iPhone signed in to an Apple ID.

New Apple accounts have no username yet; they go through the normal onboarding. Apple shares the name only on the first sign-in, and the app does not rely on it.
