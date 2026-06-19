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
    return "border-blue-200 bg-blue-50 text-blue-900";
  }

  if (tone === "attention") {
    return "border-orange-200 bg-orange-50 text-orange-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getActionButtonClass(tone: CoachNextActionTone) {
  if (tone === "attention") {
    return "bg-orange-600 text-white hover:bg-orange-700";
  }

  return "bg-blue-600 text-white hover:bg-blue-700";
}

function getEventTone(status: string) {
  if (status === "canceled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function getResponseTone(status: string) {
  if (status === "Attending" || status === "Driving Self") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Not Attending" || status === "Needs Ride") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-slate-100 text-slate-600";
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
    <article className="gd-card-light rounded-lg p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-slate-950">
            {team.name}
          </h2>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            {card.organization?.name ?? "Organization unavailable"}
          </p>
          {[team.division, team.season].filter(Boolean).length > 0 && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {[team.division, team.season].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        <span className="w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700">
          {registrations.length} rostered
        </span>
      </div>

      <div
        className={`mt-3 rounded-lg border p-3 ${getActionToneClasses(
          nextAction.tone,
        )}`}
      >
        <p className="text-xs font-black uppercase tracking-wide opacity-80">
          Main target
        </p>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-black">{nextAction.label}</p>
            <p className="mt-0.5 text-xs font-semibold opacity-90">
              {nextAction.description}
            </p>
          </div>
          {nextAction.href && (
            <Link
              href={nextAction.href}
              className={`rounded-md px-3 py-2 text-center text-xs font-black ${getActionButtonClass(
                nextAction.tone,
              )}`}
            >
              Open
            </Link>
          )}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div className="rounded-md border border-blue-100/70 bg-white/65 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-slate-500">Roster</p>
          <p className="mt-0.5 text-base text-slate-950">
            {registrations.length}
          </p>
        </div>
        <div className="rounded-md border border-blue-100/70 bg-white/65 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-slate-500">Ready</p>
          <p
            className={`mt-0.5 text-base ${
              readiness.openItems > 0 ? "text-orange-600" : "text-blue-600"
            }`}
          >
            {readiness.readyAthletes}
          </p>
        </div>
        <div className="rounded-md border border-blue-100/70 bg-white/65 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-slate-500">Open</p>
          <p
            className={`mt-0.5 text-base ${
              readiness.openItems > 0 ? "text-orange-600" : "text-blue-600"
            }`}
          >
            {readiness.openItems}
          </p>
        </div>
      </div>

      <section className="gd-card-light mt-2.5 rounded-lg p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Next event
            </p>
            {nextEvent ? (
              <>
                <p className="mt-1 truncate text-sm font-black text-slate-950">
                  {nextEvent.title}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">
                  {getEventDateLabel(nextEvent)} · {getEventTimeLabel(nextEvent)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {getEventLocationLabel(nextEvent)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                No upcoming events scheduled for this team.
              </p>
            )}
          </div>
          {nextEvent && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black ${getEventTone(
                nextEvent.status,
              )}`}
            >
              {getEventStatusLabel(nextEvent)}
            </span>
          )}
        </div>

        {nextEvent && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-blue-100/70 bg-white/65 p-2.5">
              <p className="font-semibold text-slate-500">Attendance</p>
              <p className="mt-0.5 font-black text-slate-950">
                {responseSummary.attendanceSubmitted} of {registrations.length}
              </p>
            </div>
            <div className="rounded-md border border-blue-100/70 bg-white/65 p-2.5">
              <p className="font-semibold text-slate-500">Transportation</p>
              <p className="mt-0.5 font-black text-slate-950">
                {responseSummary.transportationSubmitted} of{" "}
                {registrations.length}
              </p>
            </div>
          </div>
        )}
      </section>

      <details className="gd-card-light gd-card-interactive group mt-2.5 overflow-hidden rounded-lg">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
          <span>
            <span className="block font-black text-slate-950">
              Roster & parent contact
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-500">
              Open only when you need player contact or response details.
            </span>
          </span>
          <span className="text-lg font-black text-blue-600 transition group-open:rotate-90">
            &rsaquo;
          </span>
        </summary>
        <div className="space-y-2 border-t border-slate-200 p-3 text-sm">
          {rosterPreview.length > 0 ? (
            rosterPreview.map((player) => (
              <div
                className="rounded-md border border-blue-100/70 bg-white/70 p-2.5"
                key={player.registration.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">
                      {player.registration.athleteName ?? "Rostered athlete"}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {player.parent?.name ||
                        player.registration.parentName ||
                        "Parent"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${getResponseTone(
                      player.attendanceStatus,
                    )}`}
                  >
                    {player.attendanceStatus}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${getResponseTone(
                      player.transportationStatus,
                    )}`}
                  >
                    {player.transportationStatus}
                  </span>
                  {player.parent?.email && (
                    <a
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                      href={`mailto:${player.parent.email}`}
                    >
                      Email parent
                    </a>
                  )}
                  {player.parent?.phone && (
                    <a
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
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
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-500">
              No rostered athletes yet.
            </p>
          )}
          {registrations.length > rosterPreview.length && (
            <p className="rounded-md border border-slate-200 bg-white p-3 text-center text-xs font-black text-slate-500">
              {registrations.length - rosterPreview.length} more on the full
              team page
            </p>
          )}
        </div>
      </details>

      <div className={`mt-2.5 grid gap-2 ${nextEvent ? "grid-cols-2" : ""}`}>
        {nextEvent && (
          <Link
            href={`/events/${nextEvent.id}`}
            className="block rounded-md bg-blue-600 py-2 text-center text-xs font-black text-white hover:bg-blue-700"
          >
            Event Details
          </Link>
        )}
        <Link
          href={teamHref}
          className="block rounded-md border border-slate-200 bg-white py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
        >
          Team Details
        </Link>
      </div>
    </article>
  );
}
