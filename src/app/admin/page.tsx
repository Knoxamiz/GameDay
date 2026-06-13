import Link from "next/link";
import { redirect } from "next/navigation";
import AdminReadinessBoard from "../components/AdminReadinessBoard";
import AttendanceConcernAction from "../components/AttendanceConcernAction";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import RegistrationAdminActionLinks from "../components/RegistrationAdminActionLinks";
import SessionControls from "../components/SessionControls";
import TransportationIssueAction from "../components/TransportationIssueAction";
import { getAdminHomeReadModel } from "../data/adminHomeRead.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import {
  getEventDateLabel,
  getEventTeamIds,
  getEventTimeLabel,
} from "../data/events";
import { isCoachVisibleRosterRegistration } from "../data/registrations";
import { getTeamsNeedingCoaches } from "../data/teams";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getCurrentAuthSession();

  if (session?.claims.role !== "admin") {
    redirect("/login?role=admin");
  }

  const {
    attendanceEntries,
    coaches: organizationCoaches,
    communications: adminCommunications,
    events: adminUpcomingEvents,
    organization,
    organizations: adminOrganizations,
    registrations: organizationRegistrations,
    teams: organizationTeams,
    transportationEntries,
  } = await getAdminHomeReadModel();
  const adminUpcomingEventIdSet = new Set(
    adminUpcomingEvents.map((event) => event.id),
  );
  const adminAttendanceEntries = attendanceEntries.filter((entry) =>
    adminUpcomingEventIdSet.has(entry.eventId),
  );
  const teamsNeedingCoaches = getTeamsNeedingCoaches(organizationTeams);
  const organizationStatus = [
    {
      label: "Rostered Athletes",
      value: organizationRegistrations.filter(isCoachVisibleRosterRegistration)
        .length,
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
  const teamById = new Map(organizationTeams.map((team) => [team.id, team]));
  const hasAdminOrganizations = adminOrganizations.length > 0;
  const organizationLabel =
    !hasAdminOrganizations
      ? "No Organization Yet"
      : adminOrganizations.length > 1
      ? `${adminOrganizations.length} Organizations`
      : organization.name;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="admin" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Admin</h1>
        </div>

        <SessionControls role="admin" />

        <p className="mt-5 text-slate-300">{organizationLabel}</p>

        {!hasAdminOrganizations && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
            Create an organization in setup to start managing teams, coaches,
            invites, and events.
          </div>
        )}

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
            <Link
              href="/admin/setup"
              className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
            >
              Setup Organization, Teams, Coaches, And Invites
            </Link>
            {hasAdminOrganizations && (
              <Link
                href={getRoleHref("/events", "admin")}
                className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
              >
                Create Schedule Event
              </Link>
            )}
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
            {adminUpcomingEvents.length === 0 && (
              <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                No real events have been created yet.
              </p>
            )}
            {adminUpcomingEvents.map((event) => {
              const eventTeams = getEventTeamIds(event)
                .map((teamId) => teamById.get(teamId))
                .filter(Boolean);

              return (
                <Link
                  key={event.id}
                  href={getRoleHref(`/events/${event.id}`, "admin")}
                  className="block rounded-xl bg-slate-800 p-4"
                >
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {getEventDateLabel(event)} {getEventTimeLabel(event)}
                  </p>
                  {eventTeams.length > 0 && (
                    <p className="mt-1 text-sm text-slate-300">
                      {eventTeams.map((team) => team?.label).join(", ")}
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
