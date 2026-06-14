import type { Athlete } from "../data/athletes";
import type { AttendanceEntry } from "../data/attendance";
import {
  backendCollections,
  type BackendCollection,
} from "../data/backendSchema";
import type { Coach } from "../data/coaches";
import type { DocumentRequirement } from "../data/documents";
import type { GameDayEvent } from "../data/events";
import type { GameAlert } from "../data/gameAlerts";
import type { RegistrationInvite } from "../data/invites";
import type { GameDayMessage } from "../data/messages";
import type { OrganizationMembership } from "../data/organizationMemberships";
import type { ParentGuardian } from "../data/parents";
import type { PaymentRequirement } from "../data/payments";
import {
  isCoachVisibleRosterRegistration,
  type Registration,
} from "../data/registrations";
import type { RideShareMatch } from "../data/rideShare";
import type { Team } from "../data/teams";
import type { TransportationEntry } from "../data/transportation";
import { getFirebaseAdminApp } from "./firebaseAdmin";
import { FirebaseSdkNotInstalledError, isMissingModuleError } from "./firebase";
import type {
  AthleteRepository,
  AttendanceRepository,
  CoachRepository,
  DocumentRequirementRepository,
  EventRepository,
  GameAlertRepository,
  GameDayRepositories,
  MessageRepository,
  MutableRepository,
  OrganizationMembershipRepository,
  OrganizationRepository,
  ParentRepository,
  PaymentRequirementRepository,
  QueryScope,
  RegistrationInviteRepository,
  RegistrationRepository,
  RepositoryListOptions,
  RepositoryTransaction,
  RepositoryTransactionCallback,
  RideShareRepository,
  TeamRepository,
  TransportationRepository,
  WriteOptions,
} from "./repositories";

const firestoreModuleName = "firebase-admin/firestore";
const equalityOperator = "==";
const arrayContainsOperator = "array-contains";

type FirestoreDocumentSnapshot = {
  data: () => Record<string, unknown> | undefined;
  exists: boolean;
  id: string;
};

type FirestoreWriteResult = unknown;

type FirestoreDocumentReference = {
  delete: () => Promise<FirestoreWriteResult>;
  get: () => Promise<FirestoreDocumentSnapshot>;
  set: (
    data: Record<string, unknown>,
    options?: { merge: boolean },
  ) => Promise<FirestoreWriteResult>;
  update: (data: Record<string, unknown>) => Promise<FirestoreWriteResult>;
};

type FirestoreQuerySnapshot = {
  docs: FirestoreDocumentSnapshot[];
};

type FirestoreQuery = {
  get: () => Promise<FirestoreQuerySnapshot>;
  limit: (limit: number) => FirestoreQuery;
  where: (
    field: string,
    operator: typeof equalityOperator | typeof arrayContainsOperator,
    value: string,
  ) => FirestoreQuery;
};

type FirestoreCollectionReference = FirestoreQuery & {
  add: (data: Record<string, unknown>) => Promise<{ id: string }>;
  doc: (id: string) => FirestoreDocumentReference;
};

type FirestoreDatabase = {
  collection: (collectionName: string) => FirestoreCollectionReference;
  runTransaction: <TResult>(
    callback: (transaction: FirestoreTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
};

type FirestoreTransaction = {
  create: (
    reference: FirestoreDocumentReference,
    data: Record<string, unknown>,
  ) => FirestoreTransaction;
  get(reference: FirestoreDocumentReference): Promise<FirestoreDocumentSnapshot>;
  get(reference: FirestoreQuery): Promise<FirestoreQuerySnapshot>;
  set: (
    reference: FirestoreDocumentReference,
    data: Record<string, unknown>,
    options?: { merge: boolean },
  ) => FirestoreTransaction;
  update: (
    reference: FirestoreDocumentReference,
    data: Record<string, unknown>,
  ) => FirestoreTransaction;
};

type FirestoreAdminModule = {
  getFirestore: (app: unknown) => FirestoreDatabase;
};

async function loadFirestoreModule() {
  try {
    return (await import(firestoreModuleName)) as FirestoreAdminModule;
  } catch (error) {
    if (isMissingModuleError(error)) {
      return null;
    }

    throw error;
  }
}

async function getFirestoreDatabase() {
  const app = await getFirebaseAdminApp();
  const firestore = await loadFirestoreModule();

  if (!app || !firestore) {
    return null;
  }

  return firestore.getFirestore(app);
}

function getSnapshotRecord<TRecord>(
  snapshot: FirestoreDocumentSnapshot,
  idKey: string,
) {
  const data = snapshot.data();

  if (!snapshot.exists || !data) {
    return null;
  }

  return {
    ...data,
    [idKey]: data[idKey] ?? snapshot.id,
  } as TRecord;
}

function normalizeFirestoreDocumentId(id: unknown) {
  if (typeof id !== "string") {
    return null;
  }

  const trimmedId = id.trim();

  if (!trimmedId || trimmedId.includes("/")) {
    return null;
  }

  return trimmedId;
}

function applyScope(query: FirestoreQuery, scope?: QueryScope) {
  if (!scope) {
    return query;
  }

  return Object.entries(scope).reduce<FirestoreQuery>(
    (scopedQuery, [key, value]) =>
      value ? scopedQuery.where(key, equalityOperator, value) : scopedQuery,
    query,
  );
}

class FirestoreCollectionRepository<TRecord extends object>
  implements MutableRepository<TRecord> {
  constructor(
    private readonly collectionName: string,
    protected readonly idKey = "id",
  ) {}

  private async getCollection() {
    const database = await getFirestoreDatabase();

    if (!database) {
      return null;
    }

    return database.collection(this.collectionName);
  }

  async listWhere(
    field: string,
    operator: typeof equalityOperator | typeof arrayContainsOperator,
    value: string,
  ) {
    const collection = await this.getCollection();

    if (!collection) {
      return [];
    }

    const snapshot = await collection.where(field, operator, value).get();

    return snapshot.docs
      .map((document) => getSnapshotRecord<TRecord>(document, this.idKey))
      .filter((record): record is TRecord => Boolean(record));
  }

  async getById(id: string) {
    const documentId = normalizeFirestoreDocumentId(id);

    if (!documentId) {
      return null;
    }

    const collection = await this.getCollection();

    if (!collection) {
      return null;
    }

    const snapshot = await collection.doc(documentId).get();

    return getSnapshotRecord<TRecord>(snapshot, this.idKey);
  }

  async list(options?: RepositoryListOptions) {
    const collection = await this.getCollection();

    if (!collection) {
      return [];
    }

    const scopedQuery = applyScope(collection, options?.scope);
    const query = options?.limit ? scopedQuery.limit(options.limit) : scopedQuery;
    const snapshot = await query.get();

    return snapshot.docs
      .map((document) => getSnapshotRecord<TRecord>(document, this.idKey))
      .filter((record): record is TRecord => Boolean(record));
  }

  async create(record: TRecord, options: WriteOptions) {
    void options;
    const collection = await this.getCollection();

    if (!collection) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    const recordId = (record as Record<string, unknown>)[this.idKey];
    const documentId = normalizeFirestoreDocumentId(recordId);

    if (documentId) {
      await collection.doc(documentId).set(record as Record<string, unknown>, {
        merge: false,
      });
      return record;
    }

    const created = await collection.add(record as Record<string, unknown>);

    return {
      ...record,
      [this.idKey]: created.id,
    };
  }

  async delete(id: string, options: WriteOptions) {
    void options;
    const documentId = normalizeFirestoreDocumentId(id);

    if (!documentId) {
      throw new Error("A valid Firestore document id is required.");
    }

    const collection = await this.getCollection();

    if (!collection) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    await collection.doc(documentId).delete();
  }

  async update(id: string, patch: Partial<TRecord>, options: WriteOptions) {
    void options;
    const documentId = normalizeFirestoreDocumentId(id);

    if (!documentId) {
      throw new Error("A valid Firestore document id is required.");
    }

    const collection = await this.getCollection();

    if (!collection) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    await collection.doc(documentId).update(patch as Record<string, unknown>);

    return {
      ...(await this.getById(documentId)),
      ...patch,
      [this.idKey]: documentId,
    } as TRecord;
  }
}

class FirestoreParentRepository
  extends FirestoreCollectionRepository<ParentGuardian>
  implements ParentRepository {
  listByOrganizationId(organizationId: string) {
    return this.listWhere("organizationIds", arrayContainsOperator, organizationId);
  }
}

class FirestoreAthleteRepository
  extends FirestoreCollectionRepository<Athlete>
  implements AthleteRepository {
  listByParentId(parentId: string) {
    return this.list({ scope: { parentId } });
  }

  listByTeamId(teamId: string) {
    return this.list({ scope: { teamId } });
  }
}

function getTransactionDocumentReference(
  database: FirestoreDatabase,
  collectionName: BackendCollection,
  id: string,
) {
  const documentId = normalizeFirestoreDocumentId(id);

  if (!documentId) {
    throw new Error("A valid Firestore document id is required.");
  }

  return database.collection(collectionName).doc(documentId);
}

export async function runFirestoreTransaction<TResult>(
  callback: RepositoryTransactionCallback<TResult>,
) {
  const database = await getFirestoreDatabase();

  if (!database) {
    throw new FirebaseSdkNotInstalledError("firebase-admin");
  }

  return database.runTransaction(async (firestoreTransaction) => {
    const repositoryTransaction: RepositoryTransaction = {
      create<TRecord extends object>(
        collectionName: BackendCollection,
        id: string,
        record: TRecord,
      ) {
        firestoreTransaction.create(
          getTransactionDocumentReference(database, collectionName, id),
          record as Record<string, unknown>,
        );
      },
      async get<TRecord extends object>(
        collectionName: BackendCollection,
        id: string,
        idKey = "id",
      ) {
        const snapshot = await firestoreTransaction.get(
          getTransactionDocumentReference(database, collectionName, id),
        );

        return getSnapshotRecord<TRecord>(snapshot, idKey);
      },
      async list<TRecord extends object>(
        collectionName: BackendCollection,
        options?: RepositoryListOptions,
        idKey = "id",
      ) {
        const collection = database.collection(collectionName);
        const scopedQuery = applyScope(collection, options?.scope);
        const query = options?.limit
          ? scopedQuery.limit(options.limit)
          : scopedQuery;
        const snapshot = await firestoreTransaction.get(query);

        return snapshot.docs
          .map((document) => getSnapshotRecord<TRecord>(document, idKey))
          .filter((record): record is TRecord => Boolean(record));
      },
      set<TRecord extends object>(
        collectionName: BackendCollection,
        id: string,
        record: TRecord,
      ) {
        firestoreTransaction.set(
          getTransactionDocumentReference(database, collectionName, id),
          record as Record<string, unknown>,
          { merge: false },
        );
      },
      update<TRecord extends object>(
        collectionName: BackendCollection,
        id: string,
        record: Partial<TRecord>,
      ) {
        firestoreTransaction.update(
          getTransactionDocumentReference(database, collectionName, id),
          record as Record<string, unknown>,
        );
      },
    };

    return callback(repositoryTransaction);
  });
}

class FirestoreCoachRepository
  extends FirestoreCollectionRepository<Coach>
  implements CoachRepository {
  getByEmail(email: string) {
    return this.list({ limit: 1, scope: { email } }).then(
      (coaches) => coaches[0] ?? null,
    );
  }

  getByUid(uid: string) {
    return this.list({ limit: 1, scope: { uid } }).then(
      (coaches) => coaches[0] ?? null,
    );
  }

  async listByOrganizationId(organizationId: string) {
    const [organizationIdCoaches, organizationIdsCoaches] = await Promise.all([
      this.list({ scope: { organizationId } }),
      this.listWhere("organizationIds", arrayContainsOperator, organizationId),
    ]);

    return [
      ...new Map(
        [...organizationIdCoaches, ...organizationIdsCoaches].map((coach) => [
          coach.id,
          coach,
        ]),
      ).values(),
    ];
  }

  listByTeamId(teamId: string) {
    return this.listWhere("teamIds", arrayContainsOperator, teamId);
  }
}

class FirestoreTeamRepository
  extends FirestoreCollectionRepository<Team>
  implements TeamRepository {
  listByCoachId(coachId: string) {
    return this.listWhere("coachIds", arrayContainsOperator, coachId);
  }

  listByOrganizationId(organizationId: string) {
    return this.list({ scope: { organizationId } });
  }
}

class FirestoreEventRepository
  extends FirestoreCollectionRepository<GameDayEvent>
  implements EventRepository {
  listByOrganizationId(organizationId: string) {
    return this.list({ scope: { organizationId } });
  }

  listByTeamId(teamId: string) {
    return this.listWhere("teamIds", arrayContainsOperator, teamId);
  }
}

class FirestoreRegistrationRepository
  extends FirestoreCollectionRepository<Registration>
  implements RegistrationRepository {
  listByAthleteId(athleteId: string) {
    return this.list({ scope: { athleteId } });
  }

  listByOrganizationId(organizationId: string) {
    return this.list({ scope: { organizationId } });
  }

  listByParentId(parentId: string) {
    return this.list({ scope: { parentId } });
  }

  async listRosteredByTeamId(teamId: string) {
    const registrations = await this.list({
      scope: {
        rosterStatus: "rostered",
        teamId,
      },
    });

    return registrations.filter(isCoachVisibleRosterRegistration);
  }

  listByTeamId(teamId: string) {
    return this.list({ scope: { teamId } });
  }
}

class FirestoreDocumentRequirementRepository
  extends FirestoreCollectionRepository<DocumentRequirement>
  implements DocumentRequirementRepository {
  listByRegistrationId(registrationId: string) {
    return this.list({ scope: { registrationId } });
  }

  listByTeamId(teamId: string) {
    return this.list({ scope: { teamId } });
  }
}

class FirestorePaymentRequirementRepository
  extends FirestoreCollectionRepository<PaymentRequirement>
  implements PaymentRequirementRepository {
  listByRegistrationId(registrationId: string) {
    return this.list({ scope: { registrationId } });
  }

  listByTeamId(teamId: string) {
    return this.list({ scope: { teamId } });
  }
}

class FirestoreAttendanceRepository
  extends FirestoreCollectionRepository<AttendanceEntry>
  implements AttendanceRepository {
  listByAthleteId(athleteId: string) {
    return this.list({ scope: { athleteId } });
  }

  listByEventId(eventId: string) {
    return this.list({ scope: { eventId } });
  }
}

class FirestoreTransportationRepository
  extends FirestoreCollectionRepository<TransportationEntry>
  implements TransportationRepository {
  listByAthleteId(athleteId: string) {
    return this.list({ scope: { athleteId } });
  }

  listByEventId(eventId: string) {
    return this.list({ scope: { eventId } });
  }
}

class FirestoreRideShareRepository
  extends FirestoreCollectionRepository<RideShareMatch>
  implements RideShareRepository {
  listByEventId(eventId: string) {
    return this.list({ scope: { eventId } });
  }
}

class FirestoreMessageRepository
  extends FirestoreCollectionRepository<GameDayMessage>
  implements MessageRepository {
  listByAudience(scope: QueryScope) {
    return this.list({ scope });
  }

  listByEventId(eventId: string) {
    return this.list({ scope: { eventId } });
  }

  listByTeamId(teamId: string) {
    return this.list({ scope: { teamId } });
  }
}

class FirestoreOrganizationMembershipRepository
  extends FirestoreCollectionRepository<OrganizationMembership>
  implements OrganizationMembershipRepository {
  listByOrganizationId(organizationId: string) {
    return this.list({ scope: { organizationId } });
  }

  listByUid(uid: string) {
    return this.list({ scope: { uid } });
  }
}

class FirestoreGameAlertRepository
  extends FirestoreCollectionRepository<GameAlert>
  implements GameAlertRepository {
  constructor() {
    super("gameAlerts", "eventId");
  }

  getByEventId(eventId: string) {
    return this.getById(eventId);
  }
}

class FirestoreRegistrationInviteRepository
  extends FirestoreCollectionRepository<RegistrationInvite>
  implements RegistrationInviteRepository {
  async getByCode(code: string) {
    const exactInvite = await this.getById(code);

    if (exactInvite) {
      return exactInvite;
    }

    const invites = await this.list({ limit: 1, scope: { inviteCode: code } });

    if (invites[0]) {
      return invites[0];
    }

    return this.list({ limit: 1, scope: { code } }).then(
      (legacyInvites) => legacyInvites[0] ?? null,
    );
  }

  listByOrganizationId(organizationId: string) {
    return this.list({ scope: { organizationId } });
  }

  listByTeamId(teamId: string) {
    return this.list({ scope: { teamId } });
  }
}

export function createFirestoreRepositories(): GameDayRepositories {
  return {
    athletes: new FirestoreAthleteRepository("athletes"),
    attendance: new FirestoreAttendanceRepository("attendance"),
    coaches: new FirestoreCoachRepository("coaches"),
    documentRequirements: new FirestoreDocumentRequirementRepository(
      "documentRequirements",
    ),
    events: new FirestoreEventRepository("events"),
    gameAlerts: new FirestoreGameAlertRepository(),
    messages: new FirestoreMessageRepository("messages"),
    organizationMemberships: new FirestoreOrganizationMembershipRepository(
      "organizationMemberships",
    ),
    organizations: new FirestoreCollectionRepository(
      "organizations",
    ) as OrganizationRepository,
    parents: new FirestoreParentRepository("parents"),
    paymentRequirements: new FirestorePaymentRequirementRepository(
      "paymentRequirements",
    ),
    registrationInvites: new FirestoreRegistrationInviteRepository(
      "registrationInvites",
      "inviteCode",
    ),
    registrations: new FirestoreRegistrationRepository("registrations"),
    rideShareMatches: new FirestoreRideShareRepository("rideShareMatches"),
    teams: new FirestoreTeamRepository("teams"),
    transportation: new FirestoreTransportationRepository("transportation"),
  };
}

export function getFirestoreCollectionNames() {
  return backendCollections;
}
