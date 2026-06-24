# GameDay Release Operations

This runbook tracks the operational pieces needed before app-store submission.
It does not contain secrets.

## Account Deletion Requests

Signed-in users can request deletion from `/account/delete`. The app records a
server-side document in `accountDeletionRequests` with:

- `id`
- `uid`
- `email`
- `role`
- `status`
- `requestedAt`
- `reviewedAt`
- `reviewedBy`
- `completedAt`
- `notes`
- `updatedAt`

## Support Operations API

Support operations are intentionally not exposed to organization admins. This
avoids leaking account-level requests across tenants.

Production support tooling can call:

```bash
GET /api/support/account-deletion-requests
```

Optional query parameters:

- `status=requested`
- `status=in_review`
- `status=completed`
- `status=rejected`
- `limit=50`

To update a request:

```bash
PATCH /api/support/account-deletion-requests
```

Body:

```json
{
  "id": "account-delete-uid",
  "status": "in_review",
  "reviewedBy": "support-operator",
  "notes": "Internal non-secret support note."
}
```

Required header:

```bash
x-gameday-support-token: <SUPPORT_OPERATIONS_TOKEN>
```

## Before App Store Submission

- Confirm `NEXT_PUBLIC_SUPPORT_EMAIL`.
- Set `SUPPORT_OPERATIONS_TOKEN` in production if support API access is needed.
- Confirm who receives and resolves deletion requests.
- Confirm how completed deletion work is audited.
- Review privacy and terms text with the final data model.
- Keep support notes free of passwords, tokens, private keys, payment secrets,
  and sensitive uploaded documents.
