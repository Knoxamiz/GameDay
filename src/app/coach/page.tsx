import Link from "next/link";
import AttendanceSummaryCard from "../components/AttendanceSummaryCard";
import BottomNav from "../components/BottomNav";
import MvpNav, { getRoleHref } from "../components/MvpNav";
import RegistrationConcernAction from "../components/RegistrationConcernAction";
import TeamReadinessSummary from "../components/TeamReadinessSummary";
import TransportationSummaryCard from "../components/TransportationSummaryCard";
import { getAttendanceEntriesByEventId } from "../data/attendance";
import { getCurrentCoach } from "../data/coaches";
import { getEventById } from "../data/events";
import { getMessagesByAudience } from "../data/messages";
import { getRegistrationsByTeamId } from "../data/registrations";
import { getTeamsByCoachId } from "../data/teams";
import { getTransportationEntriesByEventId } from "../data/transportation";

const currentCoach = getCurrentCoach();
const coachTeams = getTeamsByCoachId(currentCoach.id);
const coachTeam = coachTeams[0];
const todayEvent = coachTeam?.nextEventId
  ? getEventById(coachTeam.nextEventId)
  : undefined;
const transportationEntries = todayEvent
  ? getTransportationEntriesByEventId(todayEvent.id)
  : [];
const attendanceEntries = todayEvent
  ? getAttendanceEntriesByEventId(todayEvent.id)
  : [];
const coachTeamRegistrations = coachTeam
  ? getRegistrationsByTeamId(coachTeam.id)
  : [];
const coachMessages = getMessagesByAudience(
  "coach",
  currentCoach.organizationId,
).filter((message) =>
  coachTeam ? !message.teamId || message.teamId === coachTeam.id : true,
);

export default function CoachHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="coach" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay - Coach</h1>
        </div>

        <p className="mt-5 text-slate-300">
          {currentCoach.name} · {coachTeams.length} Team
          {coachTeams.length === 1 ? "" : "s"}
        </p>

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

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">{todayEvent?.title}</p>
            <p className="mt-2 text-sm text-slate-300">{todayEvent?.time}</p>
            <p className="mt-1 text-sm text-slate-300">
              {todayEvent?.location}
            </p>
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
