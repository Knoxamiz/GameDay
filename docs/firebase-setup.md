# GameDay Firebase Setup

## Required Firebase services

- Firebase Authentication
- Firestore Database
- Firebase Storage
- Firebase Admin SDK service account
- Blaze plan required for Storage

## Required environment values

Local development uses `.env.local`.

Never commit `.env.local` or service account JSON files.

Required public client values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
