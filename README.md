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
- Firebase Auth-backed login/session flow for parent, coach, and admin accounts.
- Firestore-backed organizations, memberships, teams, invites, registrations,
  rosters, events, attendance, transportation, and messages.
- Firebase Storage-backed document upload path for registration requirements.
- Server-verified production mutations for protected workflows.
- Parent, coach, admin, event, team, registration, and athlete detail routes.
- Parent, coach, and admin readiness flows using scoped live records.
- QR/team invite paths at `/join/{inviteCode}`.
- Health endpoint at `/api/health`.
- Installable mobile metadata through `/manifest.webmanifest`.
- Mock/demo fallback exists only for buildability and non-configured local
  development; live production paths should not silently fall back.

## Public Beta Readiness

The app is no longer a disposable demo. It is the foundation of the production
GameDay app, but app-store release still requires the roadmap in
`docs/release-roadmap.md`.

Safe to deploy as:

- A controlled production beta for real organizations using Firebase-backed
  live paths.
- A role-based product walkthrough using real account scope.
- A QR registration and roster workflow with visible errors on live failures.

Not safe to deploy as:

- A public app-store release without privacy, support, account deletion, and
  app-review packaging work.
- A real payment collection system until payment compliance and provider wiring
  are complete.
- An open public chat product until moderation/reporting workflows are added.

## Environment

Optional public metadata and support settings:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.example

HEALTH_DIAGNOSTIC_TOKEN=
SUPPORT_OPERATIONS_TOKEN=
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

Bootstrap Firebase Auth custom claims for GameDay sessions:

```json
{
  "role": "admin",
  "organizationIds": ["organization-id"]
}
```

For coaches, use `role: "coach"` with `coachId` and scoped `teamIds`. For
admins, use `role: "admin"` with scoped `organizationIds`. Firestore
organization memberships and coach assignments are now the long-term source of
organization/team scope after bootstrap.

After environment values are present, check `/api/health`. It should report:

- `firebase.clientConfigured: true`
- `firebase.adminConfigured: true`
- `infrastructure.mode: configured` once Firebase and payment envs are all set

In production, detailed `/api/health` diagnostics are restricted unless the
request includes `x-gameday-health-token` matching `HEALTH_DIAGNOSTIC_TOKEN`.
Account deletion support operations are restricted unless the request includes
`x-gameday-support-token` matching `SUPPORT_OPERATIONS_TOKEN`.

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
- `repositories.ts` defines the data access layer shared by Firestore adapters and
  non-configured local fallback records.
- `storage.ts` defines document upload paths and signed upload contracts.
- `payments.ts` defines payment checkout/webhook contracts without binding Stripe yet.

Remaining release work:

- Keep the release roadmap in `docs/release-roadmap.md` current as blockers are
  removed.
- Use `docs/app-store-listing.md`, `docs/app-store-review-notes.md`,
  `docs/app-privacy-labels.md`, and `docs/mobile-packaging.md` for the App
  Store handoff.
- Keep public health diagnostics restricted before public app-store submission.
- Review privacy, terms, support, and account deletion surfaces before public
  app-store submission.
- Decide and implement payment provider/app-store compliance.
- Package a mobile shell for TestFlight/App Store review.
