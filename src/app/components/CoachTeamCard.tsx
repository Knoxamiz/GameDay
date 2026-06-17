import Link from "next/link";
import {
  getCoachTeamNextAction,
  getCoachTeamReadinessSummary,
  getCoachTeamResponseSummary,
  type CoachNextActionTone,
} from "../data/coachDashboard";
import type { CoachTeamHomeCard } from "../data/coachRead.server";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventStatusLabel,
  getEventTimeLabel,
} from "../data/events";

type CoachTeamCardProps = {
  card: CoachTeamHomeCard;
};

function getActionToneClasses(tone: CoachNextActionTone) {
  if (tone === "ready") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-100";
  }

  if (tone === "attention") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-100";
  }

  return "border-slate-700 bg-slate-950 text-slate-200";
}

function getEventTone(status: string) {
  if (status === "canceled") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-blue-500/20 text-blue-300";
}

function getReadinessTone(openItems: number, limited: boolean) {
  if (limited) {
    return "text-slate-300";
  }

  return openItems > 0 ? "text-yellow-200" : "text-blue-300";
}

function getResponseTone(status: string) {
  if (status === "Attending" || status === "Driving Self") {
    return "bg-emerald-500/20 text-emerald-200";
  }

  if (status === "Not Attending" || status === "Needs Ride") {
    return "bg-yellow-500/20 text-yellow-100";
  }

  return "bg-slate-700 text-slate-200";
}

export default function CoachTeamCard({ card }: CoachTeamCardProps) {
  const { attendanceEntries, nextEvent, registrations, team } = card;
  const teamHref = `/teams/${team.id}`;
  const eventHref = nextEvent ? `/events/${nextEvent.id}` : undefined;
  const rosteredAthleteIds = registrations.map(
    (registration) => registration.athleteId,
  );
  const readiness = getCoachTeamReadinessSummary(registrations);
  const responseSummary = getCoachTeamResponseSummary({
    attendanceEntries,
    event: nextEvent,
    rosteredAthleteIds,
    transportationEntries: card.transportationEntries,
  });
  const nextAction = getCoachTeamNextAction({
    eventHref,
    nextEvent: nextEvent ? { status: nextEvent.status } : undefined,
    responseSummary,
    rosteredAthletes: registrations.length,
    teamHref,
  });
  const rosterPreview = card.rosterPlayers.slice(0, 6).map((rosterPlayer) => {
    const attendanceStatus =
      attendanceEntries.find(
        (entry) =>
          entry.athleteId === rosterPlayer.registration.athleteId &&
          entry.eventId === nextEvent?.id,
      )?.status ?? "Unknown";
    const transportationStatus =
      card.transportationEntries.find(
        (entry) =>
          entry.athleteId === rosterPlayer.registration.athleteId &&
          entry.eventId === nextEvent?.id,
      )?.status ?? "Unknown";

    return {
      attendanceStatus,
      parent: rosterPlayer.parent,
      registration: rosterPlayer.registration,
      transportationStatus,
    };
  });

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{team.name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {card.organization?.name ?? "Organization unavailable"}
          </p>
          {[team.division, team.season].filter(Boolean).length > 0 && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {[team.division, team.season].filter(Boolean).join(" - ")}
            </p>
          )}
        </div>
        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
          {registrations.length} Rostered
        </span>
      </div>

      <div
        className={`mt-4 rounded-xl border p-4 ${getActionToneClasses(
          nextAction.tone,
        )}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Next action
        </p>
        <p className="mt-2 text-lg font-bold">{nextAction.label}</p>
        <p className="mt-2 text-sm opacity-90">{nextAction.description}</p>
        {nextAction.href && (
          <Link
            href={nextAction.href}
            className="mt-4 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
          >
            {nextAction.label}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Roster</p>
          <p className="mt-1 text-lg text-white">{registrations.length}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Ready</p>
          <p
            className={`mt-1 text-lg ${getReadinessTone(
              readiness.openItems,
              readiness.limited,
            )}`}
          >
            {readiness.readyAthletes}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Open</p>
          <p
            className={`mt-1 text-lg ${
              readiness.openItems > 0 ? "text-yellow-200" : "text-blue-300"
            }`}
          >
            {readiness.openItems}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Readiness
            </p>
            <p
              className={`mt-2 font-semibold ${getReadinessTone(
                readiness.openItems,
                readiness.limited,
              )}`}
            >
              {readiness.label}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {readiness.limited
                ? "Requirement and payment details are limited for this roster."
                : `${readiness.readyAthletes} of ${readiness.rosteredAthletes} rostered athletes ready from current registration records.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Next event
            </p>
            {nextEvent ? (
              <>
                <p className="mt-2 font-semibold">{nextEvent.title}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {getEventDateLabel(nextEvent)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {getEventTimeLabel(nextEvent)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {getEventLocationLabel(nextEvent)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-300">
                No published or canceled upcoming events are scheduled for this
                team.
              </p>
            )}
          </div>
          {nextEvent && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventTone(
                nextEvent.status,
              )}`}
            >
              {getEventStatusLabel(nextEvent)}
            </span>
          )}
        </div>

        {nextEvent && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-900 p-3">
              <p className="text-slate-400">Attendance</p>
              <p className="mt-1 font-semibold text-white">
                {responseSummary.attendanceSubmitted} of {registrations.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {responseSummary.attendanceMissing} missing
              </p>
            </div>
            <div className="rounded-xl bg-slate-900 p-3">
              <p className="text-slate-400">Transportation</p>
              <p className="mt-1 font-semibold text-white">
                {responseSummary.transportationSubmitted} of{" "}
                {registrations.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {responseSummary.transportationMissing} missing
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Roster & parent contact
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Attendance is for the next event shown above.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
            {registrations.length}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {rosterPreview.length > 0 ? (
            rosterPreview.map((player) => (
              <div
                className="rounded-xl bg-slate-900 p-3"
                key={player.registration.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {player.registration.athleteName ?? "Rostered athlete"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {player.parent?.name ||
                        player.registration.parentName ||
                        "Parent"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getResponseTone(
                      player.attendanceStatus,
                    )}`}
                  >
                    {player.attendanceStatus}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getResponseTone(
                      player.transportationStatus,
                    )}`}
                  >
                    {player.transportationStatus}
                  </span>
                  {player.parent?.email && (
                    <a
                      className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      href={`mailto:${player.parent.email}`}
                    >
                      Email parent
                    </a>
                  )}
                  {player.parent?.phone && (
                    <a
                      className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      href={`tel:${player.parent.phone}`}
                    >
                      Call
                    </a>
                  )}
                  {!player.parent?.email && !player.parent?.phone && (
                    <span className="text-xs font-semibold text-slate-500">
                      No parent contact listed
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>No rostered athletes yet.</p>
          )}
          {registrations.length > rosterPreview.length && (
            <p className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-center text-xs font-semibold text-slate-400">
              {registrations.length - rosterPreview.length} more on the full
              team page
            </p>
          )}
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${nextEvent ? "grid-cols-2" : ""}`}>
        {nextEvent && (
          <Link
            href={`/events/${nextEvent.id}`}
            className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            Event Details
          </Link>
        )}
        <Link
          href={teamHref}
          className="block rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
        >
          Team Details
        </Link>
      </div>
    </article>
  );
}
