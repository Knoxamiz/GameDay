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
  teams: Team[];
};

type AdminEventResponse = {
  error?: string;
  id?: string;
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
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Canceled", value: "canceled" },
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
  teams,
}: AdminEventFormProps) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GameDayEventType>("practice");
  const [startsAt, setStartsAt] = useState(getDefaultStartTime());
  const [endsAt, setEndsAt] = useState(getDefaultEndTime());
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<GameDayEventStatus>("published");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableTeams = teams.filter(
    (team) =>
      team.organizationId === activeOrganizationId && isActiveTeam(team),
  );

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
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">Create Event</h2>
      <p className="mt-2 text-sm text-slate-300">
        Save a real schedule item for selected teams.
      </p>

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

      {teams.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
          Create a team before adding events.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <fieldset className="rounded-xl bg-slate-800 p-3">
            <legend className="text-sm font-semibold text-slate-300">
              Teams
            </legend>
            <div className="mt-3 space-y-2">
              {availableTeams.map((team) => (
                <label
                  className="flex items-center justify-between gap-3 text-sm text-slate-300"
                  key={team.id}
                >
                  <span>{team.name}</span>
                  <input
                    checked={selectedTeamIds.includes(team.id)}
                    onChange={() => toggleTeam(team.id)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Title</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300">Type</span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
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
              <span className="text-sm font-semibold text-slate-300">
                Status
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                onChange={(event) =>
                  setStatus(event.target.value as GameDayEventStatus)
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
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setStartsAt(event.target.value)}
              type="datetime-local"
              value={startsAt}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Ends</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setEndsAt(event.target.value)}
              type="datetime-local"
              value={endsAt}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Location
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setLocationName(event.target.value)}
              value={locationName}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Address
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setAddress(event.target.value)}
              value={address}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Notes</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>

          <button
            className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void saveEvent()}
            type="button"
          >
            Create Event
          </button>
        </div>
      )}
    </section>
  );
}
