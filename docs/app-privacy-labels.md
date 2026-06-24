# GameDay App Privacy Labels Draft

This is a working App Store privacy label draft based on the current GameDay
data model. Final labels must be reviewed against the production Firebase data,
any analytics that are later added, and the final payment provider.

## Data Currently Used By Core Features

- Contact info
  - Email address
  - Parent/guardian names
  - Coach/admin names
  - Phone numbers when collected for rosters or emergency contact
- User content
  - Registration form details
  - Uploaded registration documents
  - Organization/team messages
  - Support/account deletion notes
- Identifiers
  - Firebase Auth UID
  - GameDay parent, athlete, coach, organization, team, invite, registration,
    and event IDs
- Usage/context data
  - Attendance status
  - Transportation status
  - Schedule/event participation context
- Financial info
  - Payment requirement records exist in the app model
  - Real payment collection should remain disabled until payment compliance is
    finalized

## Data Use Purposes

- App functionality
- Account management
- Organization/team access control
- Registration, roster, schedule, attendance, transportation, and document
  workflows
- Support and account deletion processing

## Tracking

No advertising tracking or third-party analytics tracking should be enabled for
first review unless the privacy policy, labels, consent flow, and SDK list are
updated.

## Child/Youth Sports Review Note

GameDay can contain youth athlete data. Before public release, review the final
data collection with applicable child privacy, organization consent, document
retention, and support processes.
