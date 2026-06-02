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
npx tsc --noEmit
npm run build
```

## Current Foundation

- Next.js app router.
- Shared mock data in `src/app/data`.
- Parent, coach, admin, event, team, registration, and athlete detail routes.
- Parent readiness flow using local mock transportation state.

No auth, Firebase, or payment processing is included yet.
