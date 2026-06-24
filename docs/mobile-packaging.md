# GameDay Mobile Packaging Runbook

The current repo is a Next.js/Firebase web app. The recommended fastest mobile
path is a Capacitor iOS wrapper around the deployed production app or exported
web build, followed by TestFlight.

This cannot be fully completed from this Windows workspace because iOS signing,
Xcode archive, and TestFlight upload require macOS with Xcode and an Apple
Developer account.

## Recommended First Wrapper

- Wrapper: Capacitor
- App ID: `app.gameday.mobile`
- App name: `GameDay`
- Web source for first review: production Vercel URL after release walkthrough
- Native platforms: iOS first

## Mac Setup Steps

Run on macOS after this web repo is clean and deployed:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init GameDay app.gameday.mobile --web-dir=out
npx cap add ios
```

If using the deployed web app inside the wrapper, configure the Capacitor server
URL in the native project only after confirming App Review accepts the final
behavior. If exporting static files instead, verify all dynamic Next.js routes
needed by Firebase sessions still work. GameDay currently uses dynamic server
routes, so a deployed-web wrapper is the likely first path.

## Required Native Assets

- App icon generated from `public/icons/gameday-icon.svg`.
- Launch screen using GameDay dark background and logo.
- iPhone screenshots after final UI pass.
- App privacy answers from `docs/app-privacy-labels.md`.
- Review notes from `docs/app-store-review-notes.md`.

## Pre-TestFlight Web Gate

Run before native packaging:

```bash
npm.cmd run typecheck
npm.cmd run lint
NEXT_DIST_DIR=.next-codex npm.cmd run build
git diff --check
```

Then deploy and complete the production walkthrough:

- Admin creates or opens organization/team.
- Invite and roster path works.
- Coach assigned team path works.
- Parent player path works.
- Support/privacy/terms/delete links are reachable.
- `/api/health` returns restricted public diagnostics in production.

## External Blockers

- Apple Developer account.
- Mac with Xcode.
- Signing certificate and provisioning profile.
- App Store Connect app record.
- Review/demo accounts created in production Firebase.
