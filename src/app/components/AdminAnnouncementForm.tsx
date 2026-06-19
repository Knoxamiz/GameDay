"use client";

import { useState } from "react";
import type { MessageAudience, MessagePriority } from "../data/messages";
import type { Team } from "../data/teams";

type AdminAnnouncementFormProps = {
  activeOrganizationId: string;
  teams?: Team[];
};

type AdminAnnouncementResponse = {
  error?: string;
  id?: string;
  message?: string;
};

export default function AdminAnnouncementForm({
  activeOrganizationId,
  teams = [],
}: AdminAnnouncementFormProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] =
    useState<MessagePriority>("Informational");
  const [selectedAudience, setSelectedAudience] = useState<MessageAudience[]>([
    "coach",
    "parent",
  ]);
  const [teamId, setTeamId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleAudience(audience: MessageAudience) {
    setSelectedAudience((currentAudience) =>
      currentAudience.includes(audience)
        ? currentAudience.filter((item) => item !== audience)
        : [...currentAudience, audience],
    );
  }

  async function saveAnnouncement() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/announcements", {
        body: JSON.stringify({
          activeOrganizationId,
          audience: selectedAudience,
          content,
          organizationId: activeOrganizationId,
          priority,
          subject,
          teamId,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminAnnouncementResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create announcement.");
      }

      setSubject("");
      setContent("");
      setTeamId("");
      setMessage(body?.message ?? "Announcement created.");
      window.location.reload();
    } catch (announcementError) {
      setError(
        announcementError instanceof Error
          ? announcementError.message
          : "Could not create announcement.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <details
      className="gd-card-dark gd-card-interactive group overflow-hidden rounded-lg"
      id="create-announcement"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-black text-white">
            Create communication
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
            Send an organization or team update.
          </span>
        </span>
        <span className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white transition group-open:hidden">
          Create +
        </span>
        <span className="hidden text-base font-black text-blue-300 transition group-open:block group-open:rotate-90">
          &gt;
        </span>
      </summary>

      {message && (
        <p className="mx-3 mt-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs font-semibold text-blue-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mx-3 mt-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3 border-t border-white/10 px-3 pb-3 pt-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-400">
              Send to
            </span>
            <select
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) => setTeamId(event.target.value)}
              value={teamId}
            >
              <option value="">Whole organization</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-400">
              Priority
            </span>
            <select
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) =>
                setPriority(event.target.value as MessagePriority)
              }
              value={priority}
            >
              <option value="Informational">Informational</option>
              <option value="Important">Important</option>
              <option value="Critical">Critical</option>
            </select>
          </label>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400">
            Audience
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["parent", "coach", "admin"] satisfies MessageAudience[]).map(
              (audience) => (
                <label
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/50 px-2.5 py-1.5 text-xs font-black text-slate-200"
                  key={audience}
                >
                  <input
                    checked={selectedAudience.includes(audience)}
                    className="size-3"
                    onChange={() => toggleAudience(audience)}
                    type="checkbox"
                  />
                  {audience.charAt(0).toUpperCase()}
                  {audience.slice(1)}
                </label>
              ),
            )}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-400">
            Title
          </span>
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-400">
            Details
          </span>
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
        </label>

        <button
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isSaving}
          onClick={() => void saveAnnouncement()}
          type="button"
        >
          {isSaving ? "Sending..." : "Send Communication"}
        </button>
      </div>
    </details>
  );
}
