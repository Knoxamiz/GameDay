import Link from "next/link";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import TransportationIssueAction from "../components/TransportationIssueAction";
import { adminUpcomingEventIds, getEventsByIds } from "../data/events";
import { adminCommunications } from "../data/messages";
import { blackDiamondsOrganization } from "../data/organizations";
import { registrationSummary } from "../data/registrations";
import { getTeamById, teamsNeedingCoachesCount } from "../data/teams";
import { transportationEntries } from "../data/transportation";

const adminUpcomingEvents = getEventsByIds(adminUpcomingEventIds);

const organizationStatus = [
  {
    label: "Registered Players",
    value: blackDiamondsOrganization.status.registeredPlayers,
  },
  {
    label: "Active Teams",
    value: blackDiamondsOrganization.status.activeTeams,
  },
  {
    label: "Coaches",
    value: blackDiamondsOrganization.status.coaches,
  },
  {
    label: "Upcoming Events",
    value: blackDiamondsOrganization.status.upcomingEvents,
  },
];

const actionItems = [`${teamsNeedingCoachesCount} Teams Need Coaches`];

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
            <Link
              href="/admin/registrations"
              className="block rounded-xl bg-slate-800 p-4 text-slate-300"
            >
              {registrationSummary.pendingRegistrations} Pending Registrations
            </Link>
            <Link
              href="/admin/registrations"
              className="block rounded-xl bg-slate-800 p-4 text-red-300"
            >
              {registrationSummary.missingPhysicals} Missing Physicals
            </Link>
            {actionItems.map((item) => (
              <p key={item} className="rounded-xl bg-slate-800 p-4 text-slate-300">
                {item}
              </p>
            ))}
            <TransportationIssueAction
              entries={transportationEntries}
              href={getRoleHref("/events", "admin")}
            />
          </div>
        </div>

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
              <p key={item}>{item}</p>
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
