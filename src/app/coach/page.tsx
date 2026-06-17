import { redirect } from "next/navigation";
import BottomNav from "../components/BottomNav";
import CoachTeamCard from "../components/CoachTeamCard";
import MvpNav from "../components/MvpNav";
import SessionControls from "../components/SessionControls";
import {
  getCoachTeamNextAction,
  getCoachTeamResponseSummary,
} from "../data/coachDashboard";
import { getCoachHomeReadModel } from "../data/coachRead.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { getLandingRouteForClaims } from "../infrastructure/auth";

export const dynamic = "force-dynamic";

export default async function CoachHome() {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.claims.role !== "coach") {
    redirect(getLandingRouteForClaims(session.claims));
  }

  const {
    coach: currentCoach,
    coachRosterRegistrations,
    coachTeam,
    coachTeamCards,
    coachTeams,
    errorMessage,
    source,
  } = await getCoachHomeReadModel();
  const organizationContext = await getOrganizationContext(
    coachTeams.map((team) => team.organizationId),
  );
  const upcomingEventCount = coachTeamCards.reduce(
    (count, card) => count + (card.nextEvent ? 1 : 0),
    0,
  );
  const actionCount = coachTeamCards.filter((card) => {
    const nextAction = getCoachTeamNextAction({
      eventHref: card.nextEvent ? `/events/${card.nextEvent.id}` : undefined,
      nextEvent: card.nextEvent ? { status: card.nextEvent.status } : undefined,
      responseSummary: getCoachTeamResponseSummary({
        attendanceEntries: card.attendanceEntries,
        event: card.nextEvent,
        rosteredAthleteIds: card.registrations.map(
          (registration) => registration.athleteId,
        ),
        transportationEntries: card.transportationEntries,
      }),
      rosteredAthletes: card.registrations.length,
      teamHref: `/teams/${card.team.id}`,
    });

    return nextAction.tone === "attention";
  }).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm font-semibold text-slate-400">Coach Home</p>
          <h1 className="mt-2 text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Assigned teams, active rosters, event responses, and next steps.
          </p>
        </div>

        <SessionControls role="coach" />

        <p className="mt-5 text-slate-300">
          {currentCoach.name} - {coachTeams.length} Active Team
          {coachTeams.length === 1 ? "" : "s"}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Teams</p>
            <p className="mt-1 text-lg text-white">{coachTeams.length}</p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Rostered</p>
            <p className="mt-1 text-lg text-white">
              {coachRosterRegistrations.length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Actions</p>
            <p
              className={`mt-1 text-lg ${
                actionCount > 0 ? "text-yellow-200" : "text-blue-300"
              }`}
            >
              {actionCount}
            </p>
          </div>
        </div>

        {upcomingEventCount > 0 && (
          <p className="mt-3 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
            {upcomingEventCount} assigned team
            {upcomingEventCount === 1 ? " has" : "s have"} an upcoming visible
            event.
          </p>
        )}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Assigned Teams
        </h2>

        <div className="mt-4 space-y-4">
          {source === "error" && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
              <p className="font-semibold">Coach dashboard could not load.</p>
              <p className="mt-2">
                {errorMessage ??
                  "Refresh and try again. No local fallback data was loaded."}
              </p>
            </div>
          )}

          {source !== "error" && coachTeamCards.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
              <p className="text-lg font-bold text-white">
                No team assigned yet.
              </p>
              <p className="mt-3">
                An admin needs to add this coach account to a team before
                roster, attendance, schedule, and parent contact tools appear.
              </p>
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Coach login email
                </p>
                <p className="mt-2 break-words font-semibold text-white">
                  {currentCoach.email || session.user.email || "Not available"}
                </p>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Admin path: open the organization, choose a team, then use
                Players & Coaches &gt; Coaches &gt; Add coach with that exact
                login email.
              </p>
            </div>
          )}

          {coachTeamCards.map((card) => (
            <CoachTeamCard key={card.team.id} card={card} />
          ))}
        </div>

        <BottomNav
          items={[
            { href: "/coach", label: "Home" },
            { href: "/events", label: "Schedule" },
            {
              href: coachTeam ? `/teams/${coachTeam.id}` : "/teams",
              label: "Team",
            },
          ]}
        />
      </section>
    </main>
  );
}
