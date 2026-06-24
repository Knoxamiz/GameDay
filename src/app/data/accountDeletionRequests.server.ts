import { FirebaseSdkNotInstalledError } from "../infrastructure/firebase";
import { getFirestoreDatabase } from "../infrastructure/firebaseRepositories";
import type { AuthSession } from "../infrastructure/auth";

export type AccountDeletionRequestStatus =
  | "completed"
  | "in_review"
  | "rejected"
  | "requested";

export type AccountDeletionRequestRecord = {
  completedAt: string | null;
  email: string | null;
  id: string;
  notes: string | null;
  requestedAt: string;
  role: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  status: AccountDeletionRequestStatus;
  uid: string;
  updatedAt: string;
};

type AccountDeletionRequestSnapshot = {
  data: () => Record<string, unknown> | undefined;
  exists: boolean;
  id: string;
};

function buildDeletionRequestId(uid: string) {
  return `account-delete-${uid}`;
}

function normalizeStatus(value: unknown): AccountDeletionRequestStatus {
  return value === "completed" ||
    value === "in_review" ||
    value === "rejected" ||
    value === "requested"
    ? value
    : "requested";
}

function getNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getDeletionRequestFromSnapshot(
  snapshot: AccountDeletionRequestSnapshot,
) {
  const data = snapshot.data();

  if (!snapshot.exists || !data) {
    return null;
  }

  return {
    completedAt: getNullableString(data.completedAt),
    email: getNullableString(data.email),
    id: getNullableString(data.id) ?? snapshot.id,
    notes: getNullableString(data.notes),
    requestedAt: getNullableString(data.requestedAt) ?? "",
    reviewedAt: getNullableString(data.reviewedAt),
    reviewedBy: getNullableString(data.reviewedBy),
    role: getNullableString(data.role),
    status: normalizeStatus(data.status),
    uid: getNullableString(data.uid) ?? "",
    updatedAt: getNullableString(data.updatedAt) ?? "",
  } satisfies AccountDeletionRequestRecord;
}

async function requireDatabase() {
  const database = await getFirestoreDatabase();

  if (!database) {
    throw new FirebaseSdkNotInstalledError("firebase-admin");
  }

  return database;
}

export async function createAccountDeletionRequest(session: AuthSession) {
  const database = await requireDatabase();
  const now = new Date().toISOString();
  const id = buildDeletionRequestId(session.user.id);
  const record: AccountDeletionRequestRecord = {
    completedAt: null,
    email: session.user.email ?? null,
    id,
    notes: null,
    requestedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    role: session.claims.role ?? null,
    status: "requested",
    uid: session.user.id,
    updatedAt: now,
  };

  await database.collection("accountDeletionRequests").doc(id).set(record, {
    merge: true,
  });

  return record;
}

export async function listAccountDeletionRequests(options: {
  limit?: number;
  status?: AccountDeletionRequestStatus;
} = {}) {
  const database = await requireDatabase();
  const collection = database.collection("accountDeletionRequests");
  const scopedQuery = options.status
    ? collection.where("status", "==", options.status)
    : collection;
  const query = scopedQuery.limit(options.limit ?? 50);
  const snapshot = await query.get();

  return snapshot.docs
    .map(getDeletionRequestFromSnapshot)
    .filter((record): record is AccountDeletionRequestRecord => Boolean(record))
    .sort((first, second) => second.requestedAt.localeCompare(first.requestedAt));
}

export async function updateAccountDeletionRequest(
  id: string,
  patch: {
    notes?: string | null;
    reviewedBy: string;
    status: AccountDeletionRequestStatus;
  },
) {
  const requestId = id.trim();

  if (!requestId || requestId.includes("/")) {
    throw new Error("A valid deletion request id is required.");
  }

  const database = await requireDatabase();
  const now = new Date().toISOString();
  const nextPatch = {
    ...(patch.status === "completed" ? { completedAt: now } : {}),
    notes: patch.notes?.trim() || null,
    reviewedAt: now,
    reviewedBy: patch.reviewedBy,
    status: patch.status,
    updatedAt: now,
  };

  await database
    .collection("accountDeletionRequests")
    .doc(requestId)
    .update(nextPatch);

  const updatedSnapshot = await database
    .collection("accountDeletionRequests")
    .doc(requestId)
    .get();
  const updatedRequest = getDeletionRequestFromSnapshot(updatedSnapshot);

  if (!updatedRequest) {
    throw new Error("Deletion request not found after update.");
  }

  return updatedRequest;
}
