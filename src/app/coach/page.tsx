import Link from "next/link";
import AttendanceSummaryCard from "../components/AttendanceSummaryCard";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import RegistrationConcernAction from "../components/RegistrationConcernAction";
import SessionControls from "../components/SessionControls";
import TeamReadinessSummary from "../components/TeamReadinessSummary";
import TransportationSummaryCard from "../components/TransportationSummaryCard";
import { getCoachHomeReadModel } from "../data/coachRead.server";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventTimeLabel,
} from "../data/events";
import {
  getRegistrationRosterStatus,
  getRosterStatusLabel,
} from "../data/registrations";

export const dynamic = "force-dynamic";

export default async function CoachHome() {
  const {
    attendanceEntries,
    coach: currentCoach,
    coachMessages,
    coachRosterRegistrations,
    coachTeam,
    coachTeamRegistrations,
    coachTeams,
    todayEvent,
    transportationEntries,
  } = await getCoachHomeReadModel();
  const coachTeamById = new Map(coachTeams.map((team) => [team.id, team]));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="coach" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Coach</h1>
        </div>

        <SessionControls role="coach" />

        <p className="mt-5 text-slate-300">
          {currentCoach.name} · {coachTeams.length} Team
          {coachTeams.length === 1 ? "" : "s"}
        </p>

        {coachTeams.length === 0 && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
            No team assignment has been added for this coach account yet.
          </div>
        )}

        {coachTeams.length > 1 && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">My Teams</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {coachTeams.map((team) => (
                <Link
                  key={team.id}
                  href={getRoleHref(`/teams/${team.id}`, "coach")}
                  className="block rounded-xl bg-slate-800 p-3 font-semibold text-white"
                >
                  {team.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Roster</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {coachRosterRegistrations.length === 0 ? (
              <p>No rostered athletes.</p>
            ) : (
              coachRosterRegistrations.map((registration) => {
                const team = coachTeamById.get(registration.teamId);

                return (
                  <div
                    className="rounded-xl bg-slate-800 p-3"
                    key={registration.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {registration.athleteName ?? registration.athleteId}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {team?.label ?? registration.teamId}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Parent: {registration.parentName}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                        {getRosterStatusLabel(
                          getRegistrationRosterStatus(registration),
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      Registration: {registration.status}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            {todayEvent ? (
              <>
                <p className="font-semibold">{todayEvent.title}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {getEventDateLabel(todayEvent)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {getEventTimeLabel(todayEvent)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {getEventLocationLabel(todayEvent)}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-300">
                No events scheduled for assigned teams.
              </p>
            )}
          </div>
          {todayEvent && (
            <Link
              href={getRoleHref(`/events/${todayEvent.id}`, "coach")}
              className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              View Event
            </Link>
          )}
        </div>

        {todayEvent && (
          <TeamReadinessSummary
            actionHref={getRoleHref(`/events/${todayEvent.id}`, "coach")}
            attendanceEntries={attendanceEntries}
            eventId={todayEvent.id}
            registrations={coachTeamRegistrations}
            transportationEntries={transportationEntries}
          />
        )}

        {todayEvent && (
          <AttendanceSummaryCard
            eventId={todayEvent.id}
            entries={attendanceEntries}
            actionHref={getRoleHref(`/events/${todayEvent.id}`, "coach")}
            actionLabel="Take Attendance"
            showDetails={false}
            title="Team Status"
          />
        )}

        {todayEvent && (
          <TransportationSummaryCard
            eventId={todayEvent.id}
            entries={transportationEntries}
            actionHref={getRoleHref(`/events/${todayEvent.id}`, "coach")}
            showDetails={false}
          />
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <div className="mt-3 space-y-3 text-sm">
            {coachTeam && (
              <RegistrationConcernAction
                href={getRoleHref(`/teams/${coachTeam.id}`, "coach")}
                registrations={coachTeamRegistrations}
              />
            )}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {coachMessages.map((item) => (
              <li key={item.id}>{item.content}</li>
            ))}
          </ul>
        </div>

        <BottomNav
          items={[
            { href: "/coach", label: "Home" },
            { href: getRoleHref("/events", "coach"), label: "Schedule" },
            {
              href: coachTeam
                ? getRoleHref(`/teams/${coachTeam.id}`, "coach")
                : getRoleHref("/teams", "coach"),
              label: "Team",
            },
          ]}
        />
      </section>
    </main>
  );
}
