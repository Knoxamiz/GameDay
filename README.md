# GameDay

GameDay is a mobile-first youth sports logistics app for parents, coaches, and administrators.

The MVP is focused on answering four questions quickly:

- Where do I need to be?
- When do I need to be there?
- What do I need?
- Am I ready?

## Development

Install dependencies:

```bash
npm install
```

Run the local app:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Run the full local readiness check:

```bash
npm run check
```

## Current Foundation

- Next.js app router.
- Shared mock data in `src/app/data`.
- Parent, coach, admin, event, team, registration, and athlete detail routes.
- Parent, coach, and admin readiness flows using shared mock data.
- Local mock state for attendance, transportation, ride share, registration, documents, payments, and Game Alert.
- QR/team invite path at `/join/black-diamonds-12u`.
- Health endpoint at `/api/health`.
- Installable mobile metadata through `/manifest.webmanifest`.

## Public Beta Readiness

The app is close to deployable as a public mobile preview, but it is not ready
for real families yet.

Safe to deploy as:

- A demo/mobile beta preview.
- A role-based product walkthrough.
- A QR registration flow prototype using mock/local state.

Not safe to deploy as:

- A real registration system.
- A real document collection system.
- A real payment system.
- A private family/team portal.

## Environment

Optional public URL for metadata, robots, and sitemap:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Production provider wiring uses these environment variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

PAYMENT_PROVIDER_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
```

The same structure is available in `.env.example`.

## Firebase Setup

Firebase packages are required before the adapters can be used:

```bash
npm install firebase firebase-admin
```

Create a Firebase project and web app, then copy the web config into:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Create a Firebase Admin service account for server-side auth, Firestore, and
Storage access. Store only these server-side values in deployment secrets:

```bash
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Required Firebase Auth custom claims for GameDay sessions:

```json
{
  "role": "parent",
  "organizationIds": ["black-diamonds"],
  "teamIds": ["black-diamonds-12u"],
  "athleteIds": ["emma-smith"],
  "parentId": "jennifer-smith"
}
```

For coaches, use `role: "coach"` with `coachId` and scoped `teamIds`. For
admins, use `role: "admin"` with scoped `organizationIds`.

After environment values are present, check `/api/health`. It should report:

- `firebase.clientConfigured: true`
- `firebase.adminConfigured: true`
- `infrastructure.mode: configured` once Firebase and payment envs are all set

If Windows or OneDrive locks the generated `.next` output locally, use an
alternate build output:

```bash
$env:NEXT_DIST_DIR=".next-codex"
npm run build
```

Cloud deployments should use the default build output.

## Backend Integration Prep

Backend collection and relationship targets are documented in
`src/app/data/backendSchema.ts`.

Production integration contracts live in `src/app/infrastructure`:

- `auth.ts` defines Firebase session, role claim, and capability boundaries.
- `env.ts` reports missing provider configuration without failing local builds.
- `firebase.ts` normalizes Firebase client/admin config once credentials exist.
- `firebaseClient.ts` initializes the Firebase web app when public env exists.
- `firebaseAdmin.ts` initializes Firebase Admin when server env exists.
- `firebaseAuth.ts` adapts login, logout, current user, and session claims.
- `firebaseRepositories.ts` maps Firestore to GameDay repository interfaces.
- `firebaseStorage.ts` adapts Firebase Storage document upload URLs.
- `repositories.ts` defines the data access layer the mock data can migrate behind.
- `storage.ts` defines document upload paths and signed upload contracts.
- `payments.ts` defines payment checkout/webhook contracts without binding Stripe yet.

Remaining real-provider work:

- Install and bind the Firebase Auth, Firestore, and Storage adapters.
- Create Firebase project credentials and persistence rules.
- Connect document upload storage through the storage provider contract.
- Connect payment provider checkout and webhook handling.
- Server-side validation for admin-only actions.
