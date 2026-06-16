"use client";

import { useState } from "react";
import {
  getEventStatusLabel,
  getEventTeamIds,
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

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  return (
    <details className="rounded-xl border border-slate-700 bg-slate-950">
      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">{event.title}</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {getEventStatusLabel(event)}
          </span>
        </div>
      </summary>

      <div className="space-y-3 border-t border-slate-800 p-4">
        <fieldset className="rounded-xl bg-slate-900 p-3">
          <legend className="text-sm font-semibold text-slate-300">
            Teams
          </legend>
          <div className="mt-3 space-y-2">
            {teams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id);
              const canSelect = isActiveTeam(team) || isSelected;

              return (
                <label
                  className="flex items-center justify-between gap-3 text-sm text-slate-300"
                  key={team.id}
                >
                  <span>
                    {team.name} ({getTeamStatusLabel(team)})
                  </span>
                  <input
                    checked={isSelected}
                    disabled={!canSelect}
                    onChange={() => toggleTeam(team.id)}
                    type="checkbox"
                  />
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Title</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            value={title}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Type</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
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
            <span className="text-sm font-semibold text-slate-300">Status</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
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

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Starts</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
            onChange={(changeEvent) => setStartsAt(changeEvent.target.value)}
            type="datetime-local"
            value={startsAt}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Ends</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
            onChange={(changeEvent) => setEndsAt(changeEvent.target.value)}
            type="datetime-local"
            value={endsAt}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Location</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
            onChange={(changeEvent) =>
              setLocationName(changeEvent.target.value)
            }
            value={locationName}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Address</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
            onChange={(changeEvent) => setAddress(changeEvent.target.value)}
            value={address}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Notes</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
            onChange={(changeEvent) => setNotes(changeEvent.target.value)}
            value={notes}
          />
        </label>

        {(status === "canceled" || status === "archived") && (
          <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-100">
            Existing attendance and transportation responses remain stored for
            history. This event will not be used as a team&apos;s next event.
          </p>
        )}

        <button
          className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Manage Events</h2>
          <p className="mt-2 text-sm text-slate-300">
            Edit event details and lifecycle status. Event IDs and organization
            ownership remain fixed.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-400">
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
        <p className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {visibleEvents.length === 0 ? (
          <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
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
