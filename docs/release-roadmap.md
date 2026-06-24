# GameDay Release Roadmap

GameDay is moving from beta prototype to production release. This roadmap is the working release plan for getting the web app stable first, then packaging the same product experience for app store submission.

## Release Definition

GameDay is ready for app store submission when a reviewer and a real youth sports customer can:

- Create or open the correct account context without role confusion.
- Create an organization or standalone team.
- Invite parents and coaches without manual explanation.
- Register players, manage rosters, and assign coaches.
- Create schedules and send team/org messages.
- Let parents see only what their player needs right now.
- Let coaches see roster, attendance, schedule, and parent communication for assigned teams.
- Sign out cleanly.
- Complete those flows on mobile without oversized layouts, dead buttons, fake data, or hidden controls.

## Product Principles

- One screen, one job.
- Primary action visible; secondary actions available but quiet.
- No role switching shortcuts in production.
- No fake data in live paths.
- Every live record is organization/team scoped unless it is truly account-level.
- Parent experience is player-first.
- Coach experience is roster, attendance, and parent communication first.
- Admin/owner experience is control without hunting.
- Standalone single-team workspaces stay separate from paid multi-team organizations.

## Release Tracks

### 1. Account And Workspace Entry

Status: In progress.

Goal: One GameDay account opens the correct account choices from real memberships, assignments, and player records.

Required before release:

- Landing page has no dead buttons.
- Signup separates paid organization, free single team, and free parent/player entry.
- Account page routes real admin, coach, parent, pending coach, and new-account states clearly.
- Admin can understand why an org created with another email is not visible.
- Invited coach/staff can accept access by signing in with the invited email.
- Sign out is always visible and above page content.

### 2. Admin/Owner Command Center

Status: In progress.

Goal: Admin opens the app and instantly sees what needs attention and which team/org to work on.

Required before release:

- Organization home is compact and focused.
- Pulse is clickable and useful, not another large dashboard block.
- Empty org focuses on Create Team.
- Existing org focuses on current team picker/list.
- Messages are icon/indicator driven unless opened.
- Alerts route directly to the thing that needs fixing.
- Settings and secondary tools stay in sidebar/drawers.

### 3. Team Workspace

Status: In progress.

Goal: After creating a team, the next obvious actions are invite link/QR and editable roster.

Required before release:

- Team page puts Invite, QR/link, and Roster Builder first.
- Roster Builder supports quick rows and paste-list entry.
- Roster save writes canonical parent, athlete, registration, and team links.
- Coach assignment is obvious and includes a coach access link.
- Remove/archive actions are clear and protected from accidental taps.
- Secondary team controls move behind compact actions.

### 4. Parent Player Layer

Status: In progress.

Goal: Parent opens GameDay and sees players plus what each player needs right now.

Required before release:

- Parent home shows player names first.
- Player rows use green/yellow/red status:
  - Green: today.
  - Yellow: upcoming.
  - Red: account/player alert.
- Add Player is quiet secondary access, not the main screen.
- Player detail exposes schedule, attendance/ride, needs, registration, and info as compact choices.
- Parent can add another player to an existing team without searching again when a current invite exists.
- Parent can still find another team by search or invite code.

### 5. Coach Layer

Status: In progress.

Goal: Coach opens GameDay to assigned teams, roster, attendance, schedule, and communication.

Required before release:

- Coach dashboard uses the same dark glass design language.
- Coach with no assignment can create an independent team or know what email to give an org admin.
- Assigned coach sees team cards ordered by action needed.
- Coach can send team messages to parents/coaches.
- Coach can view roster and parent contact without seeing admin-only controls.
- Coach can record or review attendance workflows where appropriate.

### 6. Communication System

Status: Foundation exists.

Goal: Admins and coaches can send scoped updates; parents see updates only for their players/teams.

Required before release:

- Admin organization/team messages write to the shared messages collection.
- Coach team messages write to the shared messages collection.
- Parents see scoped messages from their player/team context.
- Messaging UI is compact and not a public chat surface yet.
- If true user-generated chat is enabled, add reporting, blocking, support contact, and moderation workflows before app store submission.

### 7. Security, Data, And Reliability

Status: In progress.

Goal: Production data cannot leak across orgs, silently fail, or partially write.

Required before release:

- All production writes go through verified server routes.
- Multi-document writes are transactional or batched where needed.
- Firestore rules match the server ownership model.
- Storage rules match document ownership and org scope.
- Direct client writes are not used for protected records.
- Errors are visible; no live-path mock fallback.
- No secrets in logs, docs, commits, or client bundles.
- Vercel health diagnostics are restricted in production unless a private health
  token is provided.

### 8. Mobile App Store Packaging

Status: Started.

Goal: Convert the production web app into a store-submittable mobile product.

Recommended path:

- Stabilize the web app first.
- Choose wrapper strategy:
  - Capacitor wrapper for fastest path around the existing Next/PWA app.
  - Native rebuild only if web wrapper cannot satisfy performance or store review needs.
- Add native app icon, launch screen, bundle identifier, build signing, and store screenshots.
- App Store listing draft, privacy-label draft, review-notes draft, and mobile
  packaging runbook exist in `docs/`.
- Create App Store Connect listing, support URL, privacy policy URL, review notes, and demo account.
- Submit first to TestFlight, then production App Review.

### 9. Store Compliance And Legal

Status: Started.

Required before release:

- Privacy policy surface exists and needs final review.
- Terms of service surface exists and needs final review.
- Support/contact URL exists and needs final support address confirmation.
- Data deletion/account deletion request path exists and needs operational review.
- Private support operations API exists for deletion request review and needs
  production token/process confirmation.
- App privacy labels matching actual Firebase/Auth/Storage data use.
- App Review demo credentials or approved demo mode.
- Live backend enabled during review.
- If payments are enabled, confirm whether Apple in-app purchase rules apply to the exact product being sold.
- If minors are a target audience, review child privacy and youth-sports data handling before public launch.

## Current Ship Blockers

- App store wrapper, signing, screenshots, App Store Connect listing, and
  TestFlight build do not exist yet.
- App Store metadata/review/privacy drafts exist but need final content after
  the production walkthrough.
- Privacy policy, terms, support, and account deletion paths exist but still need
  owner/legal/support review before public submission.
- Account deletion operations exist behind a private support token, but the
  support process and responsible operator still need confirmation.
- UI consistency is improving but not fully page-by-page complete.
- True chat/moderation should not ship until reporting/blocking/support workflows exist.
- Payment collection should remain disabled or clearly non-final until payment compliance is decided.

## Next Execution Order

1. Finish compact dark-glass consistency on parent, coach, account, admin, team, schedule, registration, and member pages.
2. Finish team-first admin path: create team -> invite/QR -> roster -> coach access.
3. Finish parent player path: compact player list -> player detail choices -> add player quietly.
4. Finish coach path: team roster, attendance, scoped parent/team messages.
5. Create release legal/support/account deletion surfaces.
6. Keep production diagnostics restricted and remove stale demo language.
7. Run production walkthrough against deployed Vercel/Firebase.
8. Complete App Store Connect metadata, privacy labels, screenshots, review notes, and demo account.
9. Package mobile shell and produce TestFlight build on macOS/Xcode.

## Validation Gates

Every production slice must pass the light gate:

```bash
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Before merge/deploy checkpoints:

```bash
NEXT_DIST_DIR=.next-codex npm.cmd run build
```

Before app store submission:

- Fresh deployed walkthrough on production URL.
- Fresh TestFlight install on a real iPhone.
- Parent, coach, admin, and new-account review credentials verified.
- App privacy labels reviewed against actual data collected.
- Support, privacy, terms, and account deletion links live.

## App Store Reference Links

- Apple App Review overview: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review
- App privacy and privacy policy setup: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- TestFlight test information: https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information
- Screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
