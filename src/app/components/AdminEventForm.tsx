"use client";

import { useState } from "react";
import type {
  GameDayEventStatus,
  GameDayEventType,
} from "../data/events";
import { isActiveTeam, type Team } from "../data/teams";

type AdminEventFormProps = {
  activeOrganizationId: string;
  canCreateEvents: boolean;
  defaultOpen?: boolean;
  teams: Team[];
};

type AdminEventResponse = {
  error?: string;
  id?: string;
  message?: string;
};

type CreateEventStatus = Exclude<
  GameDayEventStatus,
  "archived" | "canceled"
>;

const eventTypeOptions: { label: string; value: GameDayEventType }[] = [
  { label: "Practice", value: "practice" },
  { label: "Game", value: "game" },
  { label: "Tournament", value: "tournament" },
  { label: "Meeting", value: "meeting" },
  { label: "Other", value: "other" },
];

const eventStatusOptions: { label: string; value: CreateEventStatus }[] = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
];

function toDateTimeLocal(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

function getDefaultStartTime() {
  const date = new Date();

  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);

  return toDateTimeLocal(date);
}

function getDefaultEndTime() {
  const date = new Date();

  date.setDate(date.getDate() + 1);
  date.setHours(20, 0, 0, 0);

  return toDateTimeLocal(date);
}

function toIsoDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default function AdminEventForm({
  activeOrganizationId,
  canCreateEvents,
  defaultOpen = false,
  teams,
}: AdminEventFormProps) {
  const availableTeams = teams.filter(
    (team) =>
      team.organizationId === activeOrganizationId && isActiveTeam(team),
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() =>
    availableTeams.length === 1 ? [availableTeams[0].id] : [],
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GameDayEventType>("practice");
  const [startsAt, setStartsAt] = useState(getDefaultStartTime());
  const [endsAt, setEndsAt] = useState(getDefaultEndTime());
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CreateEventStatus>("published");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  async function saveEvent() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/events", {
        body: JSON.stringify({
          activeOrganizationId,
          address,
          endsAt: toIsoDateTime(endsAt),
          locationName,
          notes,
          organizationId: activeOrganizationId,
          startsAt: toIsoDateTime(startsAt),
          status,
          teamIds: selectedTeamIds,
          title,
          type,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminEventResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create event.");
      }

      setMessage(body?.message ?? "Event created.");
      window.location.reload();
    } catch (eventError) {
      setError(
        eventError instanceof Error
          ? eventError.message
          : "Could not create event.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canCreateEvents) {
    return null;
  }

  return (
    <details
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
      id="create-event"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Create Event</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a practice, game, tournament, meeting, or team reminder.
            </p>
          </div>
          <span className="inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white">
            Create Event +
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-200 p-5">

      {message && (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {availableTeams.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          Create or activate a team before adding events.
        </p>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-black text-slate-700">Teams</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableTeams.map((team) => (
                <label
                  className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-2 text-sm font-black ${
                    selectedTeamIds.includes(team.id)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  key={team.id}
                >
                  <input
                    checked={selectedTeamIds.includes(team.id)}
                    className="sr-only"
                    onChange={() => toggleTeam(team.id)}
                    type="checkbox"
                  />
                  <span>{team.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Title</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Practice at Riverside Field"
              value={title}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-700">Type</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) =>
                  setType(event.target.value as GameDayEventType)
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
              <span className="text-sm font-black text-slate-700">Status</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) =>
                  setStatus(event.target.value as CreateEventStatus)
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
              <span className="text-sm font-black text-slate-700">Starts</span>
              <input
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setStartsAt(event.target.value)}
                type="datetime-local"
                value={startsAt}
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-700">Ends</span>
              <input
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setEndsAt(event.target.value)}
                type="datetime-local"
                value={endsAt}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-black text-slate-700">
              Location
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="Riverside Field"
              value={locationName}
            />
          </label>

          <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-black text-slate-700">
              More details
            </summary>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Address
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setAddress(event.target.value)}
                  value={address}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Notes
                </span>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setNotes(event.target.value)}
                  value={notes}
                />
              </label>
            </div>
          </details>

          <button
            className="w-full rounded-md bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void saveEvent()}
            type="button"
          >
            {isSaving ? "Creating Event..." : "Create Event"}
          </button>
        </div>
      )}
      </div>
    </details>
  );
}
