# GameDay App Review Notes

This file is the working handoff for App Store review. Do not put real passwords
or secrets in git. Fill final credentials in App Store Connect review notes only.

## Reviewer Access

GameDay requires live Firebase Auth sessions. Before submission, create review
users in the production Firebase project and confirm they can complete the flows
below.

### Required Review Accounts

- Admin account
  - Email: `REPLACE_IN_APP_STORE_CONNECT_ONLY`
  - Password: `REPLACE_IN_APP_STORE_CONNECT_ONLY`
  - Access: active organization owner/admin membership
- Coach account
  - Email: `REPLACE_IN_APP_STORE_CONNECT_ONLY`
  - Password: `REPLACE_IN_APP_STORE_CONNECT_ONLY`
  - Access: active coach assignment on one team
- Parent account
  - Email: `REPLACE_IN_APP_STORE_CONNECT_ONLY`
  - Password: `REPLACE_IN_APP_STORE_CONNECT_ONLY`
  - Access: at least one registered player

## Review Walkthrough

1. Open the app and choose Log in.
2. Sign in as admin.
3. Confirm the account opens an admin workspace without role switching.
4. Open a team workspace.
5. Confirm invite/registration and roster controls are available.
6. Sign out.
7. Sign in as coach.
8. Confirm the coach sees assigned team roster/schedule context only.
9. Sign out.
10. Sign in as parent.
11. Confirm the parent sees players first and can open player details.
12. Open `/account/delete` while signed in and confirm the deletion request path
    is available.

## Features Not Enabled For First Review

- Real payment collection is not enabled.
- Ride share matching is not a first-release app-store dependency.
- Scoreboard/live chat is not enabled for first review.
- Messaging is scoped organization/team update messaging, not an open public
  chat product.

## Reviewer Notes To Include

GameDay is a youth sports operations app for organizations, coaches, and
parents. Access is account-scoped through Firebase Auth and Firestore
membership/assignment records. If a reviewer signs in and sees no workspace,
the account has not been connected to review data.

Support, privacy, terms, and account deletion paths are available from the app
footer and account deletion page.
