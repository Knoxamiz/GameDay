import Link from "next/link";
import CoachTeamMessageForm from "./CoachTeamMessageForm";
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

function getEventTone(status: string) {
  if (status === "canceled") {
    return "border-red-300/30 bg-red-500/15 text-red-100";
  }

  return "border-emerald-300/30 bg-emerald-500/15 text-emerald-100";
}

function getResponseTone(status: string) {
  if (status === "Attending" || status === "Driving Self") {
    return "border-emerald-300/30 bg-emerald-500/15 text-emerald-100";
  }

  if (status === "Not Attending" || status === "Needs Ride") {
    return "border-yellow-300/30 bg-yellow-500/15 text-yellow-100";
  }

  return "border-white/10 bg-white/[0.05] text-slate-300";
}

function getMessageAudienceLabel(audience: string[]) {
  const labels = audience.map((item) =>
    item === "parent" ? "Parents" : item === "coach" ? "Coaches" : "Admins",
  );

  return labels.join(" + ");
}

function getEventStartValue(event: NonNullable<CoachTeamHomeCard["nextEvent"]>) {
  return event.startsAt || event.startDateTime || event.date || "";
}

function getDayKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).format(date);
}

function isTodayEvent(event: NonNullable<CoachTeamHomeCard["nextEvent"]>) {
  const eventStartValue = getEventStartValue(event);

  if (!eventStartValue) {
    return false;
  }

  return getDayKey(eventStartValue) === getDayKey(new Date().toISOString());
}

function getSignal({
  nextActionTone,
  nextEvent,
}: {
  nextActionTone: CoachNextActionTone;
  nextEvent?: CoachTeamHomeCard["nextEvent"];
}) {
  if (nextEvent && isTodayEvent(nextEvent) && nextEvent.status !== "canceled") {
    return {
      label: "Today",
      className:
        "border-emerald-300/40 bg-emerald-400/15 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.2)]",
    };
  }

  if (nextActionTone === "attention") {
    return {
      label: "Needs responses",
      className:
        "border-orange-300/40 bg-orange-500/15 text-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.14)]",
    };
  }

  if (nextActionTone === "ready") {
    return {
      label: "Ready",
      className:
        "border-blue-300/35 bg-blue-500/15 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.14)]",
    };
  }

  return {
    label: "Waiting",
    className: "border-white/10 bg-white/[0.055] text-slate-300",
  };
}

function getMetricToneClasses(tone: "attention" | "neutral" | "ready") {
  if (tone === "attention") {
    return "border-orange-300/30 bg-orange-500/10 text-orange-100";
  }

  if (tone === "ready") {
    return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.045] text-slate-200";
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
  const signal = getSignal({
    nextActionTone: nextAction.tone,
    nextEvent,
  });
  const rosteredAthleteIdSet = new Set(rosteredAthleteIds);
  const needsRideCount = nextEvent
    ? card.transportationEntries.filter(
        (entry) =>
          entry.eventId === nextEvent.id &&
          rosteredAthleteIdSet.has(entry.athleteId ?? "") &&
          entry.status === "Needs Ride",
      ).length
    : 0;
  const notAttendingCount = nextEvent
    ? attendanceEntries.filter(
        (entry) =>
          entry.eventId === nextEvent.id &&
          rosteredAthleteIdSet.has(entry.athleteId ?? "") &&
          entry.status === "Not Attending",
      ).length
    : 0;
  const hasResponseGaps =
    Boolean(nextEvent) &&
    (responseSummary.attendanceMissing > 0 ||
      responseSummary.transportationMissing > 0);
  const attendanceMetricLabel = !nextEvent
    ? "No event"
    : registrations.length === 0
      ? "No players"
      : `${responseSummary.attendanceSubmitted}/${registrations.length} set`;
  const rideMetricLabel = !nextEvent
    ? "No event"
    : registrations.length === 0
      ? "No players"
      : needsRideCount > 0
        ? `${needsRideCount} need ride`
        : `${responseSummary.transportationSubmitted}/${registrations.length} set`;
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
  const latestTeamMessage = card.teamMessages[0];

  return (
    <article className="gd-card-dark rounded-lg p-3 shadow-[0_0_28px_rgba(37,99,235,0.12)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-white">
            {team.name}
          </h2>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
            {card.organization?.name ?? "Organization unavailable"}
          </p>
          {[team.division, team.season].filter(Boolean).length > 0 && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {[team.division, team.season].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-black ${signal.className}`}
          >
            {signal.label}
          </span>
        </div>
      </div>

      <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-md border border-blue-300/20 bg-blue-950/20">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
              Next
            </p>
            {nextEvent ? (
              <>
                <p className="mt-0.5 truncate text-sm font-black text-white">
                  {nextEvent.title}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                  {getEventDateLabel(nextEvent)} - {getEventTimeLabel(nextEvent)}
                  {" / "}
                  {getEventLocationLabel(nextEvent)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-sm font-black text-white">
                  {nextAction.label}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                  {nextAction.description}
                </p>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {nextEvent && (
              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-black ${getEventTone(
                  nextEvent.status,
                )}`}
              >
                {getEventStatusLabel(nextEvent)}
              </span>
            )}
            <Link
              href={nextAction.href ?? teamHref}
              className="rounded-md border border-blue-300/25 bg-blue-500/15 px-3 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/25"
            >
              {nextAction.label}
            </Link>
          </div>
        </div>

        <div className="grid gap-px bg-white/10 text-xs font-black sm:grid-cols-4">
          <div className="bg-slate-950/40 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-wide text-slate-500">
              Roster
            </span>
            <span className="mt-0.5 block text-white">
              {registrations.length} players
            </span>
          </div>
          <div
            className={`px-3 py-2 ${getMetricToneClasses(
              nextEvent && responseSummary.attendanceMissing > 0
                ? "attention"
                : nextEvent
                  ? "ready"
                  : "neutral",
            )}`}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-70">
              Attendance
            </span>
            <span className="mt-0.5 block">
              {attendanceMetricLabel}
            </span>
          </div>
          <div
            className={`px-3 py-2 ${getMetricToneClasses(
              needsRideCount > 0 ||
                (nextEvent && responseSummary.transportationMissing > 0)
                ? "attention"
                : nextEvent
                  ? "ready"
                  : "neutral",
            )}`}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-70">
              Rides
            </span>
            <span className="mt-0.5 block">
              {rideMetricLabel}
            </span>
          </div>
          <div
            className={`px-3 py-2 ${getMetricToneClasses(
              readiness.openItems > 0 || notAttendingCount > 0
                ? "attention"
                : registrations.length > 0
                  ? "ready"
                  : "neutral",
            )}`}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-70">
              Player needs
            </span>
            <span className="mt-0.5 block">
              {readiness.openItems > 0
                ? `${readiness.openItems} open`
                : notAttendingCount > 0
                  ? `${notAttendingCount} out`
                  : readiness.label}
            </span>
          </div>
        </div>
      </div>

      {latestTeamMessage && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-blue-300/20 bg-blue-500/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
              Latest message
            </p>
            <p className="mt-0.5 truncate text-sm font-black text-white">
              {latestTeamMessage.subject}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-400">
              {latestTeamMessage.content}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-100">
            {getMessageAudienceLabel(latestTeamMessage.audience)}
          </span>
        </div>
      )}

      <details className="group mt-2 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
          <span>
            <span className="block text-sm font-black text-white">
              Roster and parent contact
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-400">
              Open the list only when you need an athlete or family.
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${
                hasResponseGaps
                  ? "border-orange-300/30 bg-orange-500/10 text-orange-100"
                  : "border-white/10 bg-white/[0.05] text-slate-200"
              }`}
            >
              {registrations.length}
            </span>
            <span className="text-lg font-black text-blue-200 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-white/10 p-3 text-sm">
          {rosterPreview.length > 0 ? (
            rosterPreview.map((player) => (
              <div
                className="rounded-md border border-white/10 bg-white/[0.04] p-2.5"
                key={player.registration.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {player.registration.athleteName ?? "Rostered athlete"}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {player.parent?.name ||
                        player.registration.parentName ||
                        "Parent"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${getResponseTone(
                      player.attendanceStatus,
                    )}`}
                  >
                    {player.attendanceStatus}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-black ${getResponseTone(
                      player.transportationStatus,
                    )}`}
                  >
                    {player.transportationStatus}
                  </span>
                  {player.parent?.email && (
                    <a
                      className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-black text-slate-200 hover:bg-white/10"
                      href={`mailto:${player.parent.email}`}
                    >
                      Email parent
                    </a>
                  )}
                  {player.parent?.phone && (
                    <a
                      className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-black text-slate-200 hover:bg-white/10"
                      href={`tel:${player.parent.phone}`}
                    >
                      Call
                    </a>
                  )}
                  {!player.parent?.email && !player.parent?.phone && (
                    <span className="text-xs font-semibold text-slate-400">
                      No parent contact listed
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-slate-400">
              No rostered athletes yet.
            </p>
          )}
          {registrations.length > rosterPreview.length && (
            <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-center text-xs font-black text-slate-400">
              {registrations.length - rosterPreview.length} more on the full
              team page
            </p>
          )}
        </div>
      </details>

      <details className="group mt-2 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
          <span>
            <span className="block text-sm font-black text-white">
              Team message
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-400">
              Send one update to parents or coaches.
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-black text-blue-100">
              {card.teamMessages.length}
            </span>
            <span className="text-lg font-black text-blue-200 transition group-open:rotate-90">
              &rsaquo;
            </span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-white/10 p-3 text-sm">
          <CoachTeamMessageForm teamId={team.id} />
          <div className="space-y-1.5">
            {card.teamMessages.length > 0 ? (
              card.teamMessages.map((message) => (
                <article
                  className="rounded-md border border-white/10 bg-white/[0.04] p-2.5"
                  key={message.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-white">
                      {message.subject}
                    </h3>
                    <span className="shrink-0 rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-100">
                      {getMessageAudienceLabel(message.audience)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
                    {message.content}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-slate-400">
                No team messages yet.
              </p>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}
