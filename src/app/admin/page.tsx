import Link from "next/link";
import AdminReadinessBoard from "../components/AdminReadinessBoard";
import AttendanceConcernAction from "../components/AttendanceConcernAction";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import RegistrationAdminActionLinks from "../components/RegistrationAdminActionLinks";
import TransportationIssueAction from "../components/TransportationIssueAction";
import { attendanceEntries } from "../data/attendance";
import { getCoachesByOrganizationId } from "../data/coaches";
import { getEventsByOrganizationId } from "../data/events";
import { getMessagesByAudience } from "../data/messages";
import { blackDiamondsOrganization } from "../data/organizations";
import { getRegistrationsByOrganizationId } from "../data/registrations";
import {
  getTeamById,
  getTeamsByOrganizationId,
  getTeamsNeedingCoaches,
} from "../data/teams";
import { transportationEntries } from "../data/transportation";

const adminUpcomingEvents = getEventsByOrganizationId(
  blackDiamondsOrganization.id,
);
const adminUpcomingEventIdSet = new Set(
  adminUpcomingEvents.map((event) => event.id),
);
const adminAttendanceEntries = attendanceEntries.filter((entry) =>
  adminUpcomingEventIdSet.has(entry.eventId),
);
const organizationTeams = getTeamsByOrganizationId(blackDiamondsOrganization.id);
const organizationCoaches = getCoachesByOrganizationId(
  blackDiamondsOrganization.id,
);
const organizationRegistrations = getRegistrationsByOrganizationId(
  blackDiamondsOrganization.id,
);
const teamsNeedingCoaches = getTeamsNeedingCoaches(organizationTeams);
const adminCommunications = getMessagesByAudience(
  "admin",
  blackDiamondsOrganization.id,
);

const organizationStatus = [
  {
    label: "Registered Players",
    value: organizationTeams.reduce(
      (playerCount, team) => playerCount + team.playerCount,
      0,
    ),
  },
  {
    label: "Active Teams",
    value: organizationTeams.length,
  },
  {
    label: "Coaches",
    value: organizationCoaches.length,
  },
  {
    label: "Upcoming Events",
    value: adminUpcomingEvents.length,
  },
];

export default function AdminHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="admin" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Admin</h1>
        </div>

        <p className="mt-5 text-slate-300">{blackDiamondsOrganization.name}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Organization Status
          </h2>
          <div className="mt-4 space-y-3">
            {organizationStatus.map((status) => (
              <div key={status.label} className="rounded-xl bg-slate-800 p-4">
                <p className="text-xl font-bold">
                  {status.value} {status.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <div className="mt-3 space-y-3 text-sm">
            <RegistrationAdminActionLinks
              href="/admin/registrations"
              registrations={organizationRegistrations}
            />
            {teamsNeedingCoaches.map((team) => (
              <Link
                key={team.id}
                href={getRoleHref(`/teams/${team.id}`, "admin")}
                className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
              >
                {team.name} Needs Coach
              </Link>
            ))}
            <AttendanceConcernAction
              entries={adminAttendanceEntries}
              href={getRoleHref("/events", "admin")}
            />
            <TransportationIssueAction
              entries={transportationEntries}
              href={getRoleHref("/events", "admin")}
            />
          </div>
        </div>

        <AdminReadinessBoard
          attendanceEntries={attendanceEntries}
          events={adminUpcomingEvents}
          registrations={organizationRegistrations}
          teams={organizationTeams}
          transportationEntries={transportationEntries}
        />

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {adminUpcomingEvents.map((event) => {
              const team = event.teamId ? getTeamById(event.teamId) : undefined;

              return (
                <Link
                  key={event.id}
                  href={getRoleHref(`/events/${event.id}`, "admin")}
                  className="block rounded-xl bg-slate-800 p-4"
                >
                  <p className="font-semibold">{event.title}</p>
                  {team && (
                    <p className="mt-1 text-sm text-slate-300">
                      {team.label}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
          <Link
            href={getRoleHref("/events", "admin")}
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Schedule
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Communications</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {adminCommunications.map((item) => (
              <p key={item.id}>{item.content}</p>
            ))}
          </div>
        </div>

        <BottomNav
          items={[
            { href: "/admin", label: "Home" },
            { href: getRoleHref("/teams", "admin"), label: "Teams" },
            { href: "/admin/registrations", label: "Registration" },
            { href: getRoleHref("/events", "admin"), label: "Schedule" },
          ]}
        />
      </section>
    </main>
  );
}
