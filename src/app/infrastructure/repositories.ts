import type { AccessRole } from "../data/accessControl";
import type { Athlete } from "../data/athletes";
import type { AttendanceEntry } from "../data/attendance";
import type { Coach } from "../data/coaches";
import type { DocumentRequirement } from "../data/documents";
import type { GameDayEvent } from "../data/events";
import type { GameAlert } from "../data/gameAlerts";
import type { RegistrationInvite } from "../data/invites";
import type { GameDayMessage } from "../data/messages";
import type { OrganizationMembership } from "../data/organizationMemberships";
import type { Organization } from "../data/organizations";
import type { ParentGuardian } from "../data/parents";
import type { PaymentRequirement } from "../data/payments";
import type { Registration } from "../data/registrations";
import type { RideShareMatch } from "../data/rideShare";
import type { Team } from "../data/teams";
import type { TransportationEntry } from "../data/transportation";

export type QueryScope = {
  athleteId?: string;
  code?: string;
  coachId?: string;
  email?: string;
  eventId?: string;
  organizationId?: string;
  ownerUid?: string;
  parentId?: string;
  parentUid?: string;
  registrationId?: string;
  role?: string;
  rosterStatus?: string;
  status?: string;
  teamId?: string;
  uid?: string;
};

export type RepositoryActor = {
  athleteIds: string[];
  id: string;
  organizationIds: string[];
  role: AccessRole;
  teamIds: string[];
};

export type WriteOptions = {
  actor: RepositoryActor;
  reason?: string;
};

export type RepositoryListOptions = {
  limit?: number;
  scope?: QueryScope;
};

export interface ReadRepository<TRecord, TKey = string> {
  getById(id: TKey, scope?: QueryScope): Promise<TRecord | null>;
  list(options?: RepositoryListOptions): Promise<TRecord[]>;
}

export interface MutableRepository<TRecord, TKey = string>
  extends ReadRepository<TRecord, TKey> {
  create(record: TRecord, options: WriteOptions): Promise<TRecord>;
  delete(id: TKey, options: WriteOptions): Promise<void>;
  update(
    id: TKey,
    patch: Partial<TRecord>,
    options: WriteOptions,
  ): Promise<TRecord>;
}

export type OrganizationRepository = MutableRepository<Organization>;

export interface OrganizationMembershipRepository
  extends MutableRepository<OrganizationMembership> {
  listByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMembership[]>;
  listByUid(uid: string): Promise<OrganizationMembership[]>;
}

export interface ParentRepository extends MutableRepository<ParentGuardian> {
  listByOrganizationId(organizationId: string): Promise<ParentGuardian[]>;
}

export interface AthleteRepository extends MutableRepository<Athlete> {
  listByParentId(parentId: string): Promise<Athlete[]>;
  listByTeamId(teamId: string): Promise<Athlete[]>;
}

export interface CoachRepository extends MutableRepository<Coach> {
  getByEmail(email: string): Promise<Coach | null>;
  getByUid(uid: string): Promise<Coach | null>;
  listByOrganizationId(organizationId: string): Promise<Coach[]>;
  listByTeamId(teamId: string): Promise<Coach[]>;
}

export interface TeamRepository extends MutableRepository<Team> {
  listByCoachId(coachId: string): Promise<Team[]>;
  listByOrganizationId(organizationId: string): Promise<Team[]>;
}

export interface EventRepository extends MutableRepository<GameDayEvent> {
  listByOrganizationId(organizationId: string): Promise<GameDayEvent[]>;
  listByTeamId(teamId: string): Promise<GameDayEvent[]>;
}

export interface RegistrationRepository extends MutableRepository<Registration> {
  listByAthleteId(athleteId: string): Promise<Registration[]>;
  listByOrganizationId(organizationId: string): Promise<Registration[]>;
  listByParentId(parentId: string): Promise<Registration[]>;
  listRosteredByTeamId(teamId: string): Promise<Registration[]>;
  listByTeamId(teamId: string): Promise<Registration[]>;
}

export interface DocumentRequirementRepository
  extends MutableRepository<DocumentRequirement> {
  listByRegistrationId(registrationId: string): Promise<DocumentRequirement[]>;
  listByTeamId(teamId: string): Promise<DocumentRequirement[]>;
}

export interface PaymentRequirementRepository
  extends MutableRepository<PaymentRequirement> {
  listByRegistrationId(registrationId: string): Promise<PaymentRequirement[]>;
  listByTeamId(teamId: string): Promise<PaymentRequirement[]>;
}

export interface AttendanceRepository
  extends MutableRepository<AttendanceEntry> {
  listByAthleteId(athleteId: string): Promise<AttendanceEntry[]>;
  listByEventId(eventId: string): Promise<AttendanceEntry[]>;
}

export interface TransportationRepository
  extends MutableRepository<TransportationEntry> {
  listByAthleteId(athleteId: string): Promise<TransportationEntry[]>;
  listByEventId(eventId: string): Promise<TransportationEntry[]>;
}

export interface RideShareRepository
  extends MutableRepository<RideShareMatch> {
  listByEventId(eventId: string): Promise<RideShareMatch[]>;
}

export interface MessageRepository extends MutableRepository<GameDayMessage> {
  listByAudience(scope: QueryScope): Promise<GameDayMessage[]>;
  listByEventId(eventId: string): Promise<GameDayMessage[]>;
  listByTeamId(teamId: string): Promise<GameDayMessage[]>;
}

export interface GameAlertRepository
  extends MutableRepository<GameAlert, string> {
  getByEventId(eventId: string): Promise<GameAlert | null>;
}

export interface RegistrationInviteRepository
  extends MutableRepository<RegistrationInvite> {
  getByCode(code: string): Promise<RegistrationInvite | null>;
  listByOrganizationId(organizationId: string): Promise<RegistrationInvite[]>;
  listByTeamId(teamId: string): Promise<RegistrationInvite[]>;
}

export type GameDayRepositories = {
  athletes: AthleteRepository;
  attendance: AttendanceRepository;
  coaches: CoachRepository;
  documentRequirements: DocumentRequirementRepository;
  events: EventRepository;
  gameAlerts: GameAlertRepository;
  messages: MessageRepository;
  organizationMemberships: OrganizationMembershipRepository;
  organizations: OrganizationRepository;
  parents: ParentRepository;
  paymentRequirements: PaymentRequirementRepository;
  registrationInvites: RegistrationInviteRepository;
  registrations: RegistrationRepository;
  rideShareMatches: RideShareRepository;
  teams: TeamRepository;
  transportation: TransportationRepository;
};
