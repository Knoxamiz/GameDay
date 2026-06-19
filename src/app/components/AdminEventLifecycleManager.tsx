"use client";

import { useState } from "react";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventStatusLabel,
  getEventTeamIds,
  getEventTimeLabel,
  isArchivedEvent,
  type GameDayEvent,
  type GameDayEventStatus,
  type GameDayEventType,
} from "../data/events";
import {
  getTeamStatusLabel,
  isActiveTeam,
  type Team,
} from "../data/teams";

type AdminEventLifecycleManagerProps = {
  activeOrganizationId: string;
  events: GameDayEvent[];
  teams: Team[];
};

type AdminEventResponse = {
  error?: string;
  message?: string;
};

const eventTypeOptions: { label: string; value: GameDayEventType }[] = [
  { label: "Practice", value: "practice" },
  { label: "Game", value: "game" },
  { label: "Tournament", value: "tournament" },
  { label: "Meeting", value: "meeting" },
  { label: "Other", value: "other" },
];

const eventStatusOptions: { label: string; value: GameDayEventStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Canceled", value: "canceled" },
  { label: "Archived", value: "archived" },
];

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getStatusClass(status: GameDayEventStatus) {
  if (status === "published") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "draft") {
    return "bg-orange-50 text-orange-700";
  }

  if (status === "canceled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function EventLifecycleEditor({
  activeOrganizationId,
  event,
  isSaving,
  onSave,
  teams,
}: {
  activeOrganizationId: string;
  event: GameDayEvent;
  isSaving: boolean;
  onSave: (eventId: string, payload: Record<string, unknown>) => Promise<void>;
  teams: Team[];
}) {
  const initialTeamIds = getEventTeamIds(event);
  const [selectedTeamIds, setSelectedTeamIds] =
    useState<string[]>(initialTeamIds);
  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState<GameDayEventType>(event.type);
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(event.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(event.endsAt));
  const [locationName, setLocationName] = useState(event.locationName);
  const [address, setAddress] = useState(event.address ?? "");
  const [notes, setNotes] = useState(
    Array.isArray(event.notes) ? event.notes.join("\n") : (event.notes ?? ""),
  );
  const [status, setStatus] = useState<GameDayEventStatus>(event.status);
  const eventTeamNames = initialTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId)?.name)
    .filter(Boolean)
    .join(", ");

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  return (
    <details className="gd-card-dark group rounded-lg">
      <summary className="cursor-pointer list-none p-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">
              {event.title}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {getEventDateLabel(event)} · {getEventTimeLabel(event)}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {eventTeamNames || "Organization"} ·{" "}
              {getEventLocationLabel(event)}
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${getStatusClass(
              event.status,
            )}`}
          >
            {getEventStatusLabel(event)}
          </span>
        </div>
      </summary>

      <div className="space-y-3 border-t border-white/10 p-3">
        <fieldset>
          <legend className="text-xs font-black uppercase text-slate-400">
            Teams
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {teams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id);
              const canSelect = isActiveTeam(team) || isSelected;

              return (
                <label
                  className={`inline-flex cursor-pointer items-center rounded-md border px-2.5 py-1.5 text-xs font-black ${
                    isSelected
                      ? "border-blue-400 bg-blue-500/15 text-blue-100"
                      : canSelect
                        ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                        : "border-white/10 bg-white/[0.03] text-slate-500"
                  }`}
                  key={team.id}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    disabled={!canSelect}
                    onChange={() => toggleTeam(team.id)}
                    type="checkbox"
                  />
                  <span>
                    {team.name}
                    {!isActiveTeam(team) ? ` (${getTeamStatusLabel(team)})` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">
            Title
          </span>
          <input
            className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            value={title}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-400">
              Type
            </span>
            <select
              className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(changeEvent) =>
                setType(changeEvent.target.value as GameDayEventType)
              }
              value={type}
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-400">
              Status
            </span>
            <select
              className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(changeEvent) =>
                setStatus(changeEvent.target.value as GameDayEventStatus)
              }
              value={status}
            >
              {eventStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-400">
              Starts
            </span>
            <input
              className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(changeEvent) => setStartsAt(changeEvent.target.value)}
              type="datetime-local"
              value={startsAt}
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-400">
              Ends
            </span>
            <input
              className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(changeEvent) => setEndsAt(changeEvent.target.value)}
              type="datetime-local"
              value={endsAt}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">
            Location
          </span>
          <input
            className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
            onChange={(changeEvent) =>
              setLocationName(changeEvent.target.value)
            }
            value={locationName}
          />
        </label>

        <details className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <summary className="cursor-pointer text-xs font-black text-slate-200">
            More details
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-400">
                Address
              </span>
              <input
                className="mt-1.5 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                onChange={(changeEvent) => setAddress(changeEvent.target.value)}
                value={address}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-400">
                Notes
              </span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                onChange={(changeEvent) => setNotes(changeEvent.target.value)}
                value={notes}
              />
            </label>
          </div>
        </details>

        {(status === "canceled" || status === "archived") && (
          <p className="rounded-md border border-orange-300/30 bg-orange-500/10 p-2.5 text-xs font-semibold text-orange-100">
            Existing attendance and transportation responses remain stored for
            history. This event will not be used as a team&apos;s next event.
          </p>
        )}

        <button
          className="w-full rounded-md bg-blue-600 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() =>
            void onSave(event.id, {
              activeOrganizationId,
              address,
              endsAt: toIsoDateTime(endsAt),
              eventId: event.id,
              locationName,
              notes,
              organizationId: activeOrganizationId,
              startsAt: toIsoDateTime(startsAt),
              status,
              teamIds: selectedTeamIds,
              title,
              type,
            })
          }
          type="button"
        >
          {isSaving ? "Saving Event..." : "Save Event Changes"}
        </button>
      </div>
    </details>
  );
}

export default function AdminEventLifecycleManager({
  activeOrganizationId,
  events,
  teams,
}: AdminEventLifecycleManagerProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleEvents = events.filter(
    (event) => showArchived || !isArchivedEvent(event),
  );

  async function saveEvent(
    eventId: string,
    payload: Record<string, unknown>,
  ) {
    setError(null);
    setMessage(null);
    setSavingEventId(eventId);

    try {
      const response = await fetch("/api/admin/events", {
        body: JSON.stringify(payload),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminEventResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update event.");
      }

      setMessage(body?.message ?? "Event updated.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update event.",
      );
    } finally {
      setSavingEventId(null);
    }
  }

  return (
    <section className="gd-card-dark rounded-lg p-3 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-white">Existing Events</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Open an event only when you need to change details or status.
          </p>
        </div>
        <label className="flex w-fit shrink-0 items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-300">
          <input
            checked={showArchived}
            onChange={(changeEvent) =>
              setShowArchived(changeEvent.target.checked)
            }
            type="checkbox"
          />
          Archived
        </label>
      </div>

      {message && (
        <p className="mt-3 rounded-md border border-blue-300/30 bg-blue-500/10 p-2.5 text-xs font-bold text-blue-100">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md border border-red-300/30 bg-red-500/10 p-2.5 text-xs font-bold text-red-100">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {visibleEvents.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 bg-white/[0.04] p-3 text-xs font-semibold text-slate-400">
            No events in this view.
          </p>
        ) : (
          visibleEvents.map((event) => (
            <EventLifecycleEditor
              activeOrganizationId={activeOrganizationId}
              event={event}
              isSaving={savingEventId === event.id}
              key={event.id}
              onSave={saveEvent}
              teams={teams}
            />
          ))
        )}
      </div>
    </section>
  );
}
