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

type MessageTarget = "org-all" | "org-coaches" | "org-parents" | "team";

const messageTargets: {
  description: string;
  label: string;
  value: MessageTarget;
}[] = [
  {
    description: "Parents, coaches, and admins",
    label: "Whole org",
    value: "org-all",
  },
  {
    description: "All parent accounts",
    label: "Parents",
    value: "org-parents",
  },
  {
    description: "All coach accounts",
    label: "Coaches",
    value: "org-coaches",
  },
  {
    description: "One team workspace",
    label: "Team",
    value: "team",
  },
];

function getTargetAudience(
  target: MessageTarget,
  selectedTeamAudience: MessageAudience[],
): MessageAudience[] {
  if (target === "org-all") {
    return ["admin", "coach", "parent"];
  }

  if (target === "org-coaches") {
    return ["coach"];
  }

  if (target === "org-parents") {
    return ["parent"];
  }

  return selectedTeamAudience.length > 0 ? selectedTeamAudience : ["parent"];
}

function getTargetLabel(target: MessageTarget, teamId: string, teams: Team[]) {
  if (target === "team") {
    const team = teams.find((item) => item.id === teamId);

    return team ? team.name : "Choose team";
  }

  return messageTargets.find((item) => item.value === target)?.label ?? "Target";
}

export default function AdminAnnouncementForm({
  activeOrganizationId,
  teams = [],
}: AdminAnnouncementFormProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] =
    useState<MessagePriority>("Informational");
  const [target, setTarget] = useState<MessageTarget>("org-parents");
  const [selectedTeamAudience, setSelectedTeamAudience] = useState<
    MessageAudience[]
  >([
    "coach",
    "parent",
  ]);
  const [teamId, setTeamId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleTeamAudience(audience: MessageAudience) {
    setSelectedTeamAudience((currentAudience) =>
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
      if (target === "team" && !teamId) {
        throw new Error("Choose a team before sending.");
      }

      const audience = getTargetAudience(target, selectedTeamAudience);
      const response = await fetch("/api/admin/announcements", {
        body: JSON.stringify({
          activeOrganizationId,
          audience,
          content,
          organizationId: activeOrganizationId,
          priority,
          subject,
          teamId: target === "team" ? teamId : "",
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
      setTarget("org-parents");
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

  const targetLabel = getTargetLabel(target, teamId, teams);

  return (
    <details
      className="gd-card-dark gd-card-interactive group overflow-hidden rounded-lg"
      id="create-announcement"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-black text-white">
            New message
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
            Target: {targetLabel}
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

      <div className="space-y-2.5 border-t border-white/10 px-3 pb-3 pt-2.5">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-400">
            Target
          </p>
          <div className="mt-1 grid gap-1.5 sm:grid-cols-4">
            {messageTargets.map((option) => (
              <button
                className={`rounded-md border px-2.5 py-2 text-left transition ${
                  target === option.value
                    ? "border-blue-300/40 bg-blue-500/20 text-white shadow-[0_0_22px_rgba(37,99,235,0.16)]"
                    : "border-white/10 bg-slate-950/45 text-slate-300 hover:bg-white/10"
                }`}
                key={option.value}
                onClick={() => setTarget(option.value)}
                type="button"
              >
                <span className="block text-xs font-black">{option.label}</span>
                <span className="mt-0.5 block text-[10px] font-semibold opacity-70">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {target === "team" && (
          <div className="grid gap-2 rounded-md border border-blue-300/15 bg-blue-500/10 p-2 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Team
              </span>
              <select
                className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                onChange={(event) => setTeamId(event.target.value)}
                value={teamId}
              >
                <option value="">Choose team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-[11px] font-bold uppercase text-slate-400">
                Audience
              </legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(["parent", "coach"] satisfies MessageAudience[]).map(
                  (audience) => (
                    <label
                      className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/50 px-2.5 py-2 text-xs font-black text-slate-200"
                      key={audience}
                    >
                      <input
                        checked={selectedTeamAudience.includes(audience)}
                        className="size-3"
                        onChange={() => toggleTeamAudience(audience)}
                        type="checkbox"
                      />
                      {audience === "parent" ? "Parents" : "Coaches"}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Title
            </span>
            <input
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Practice update"
              value={subject}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Priority
            </span>
            <select
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
              onChange={(event) =>
                setPriority(event.target.value as MessagePriority)
              }
              value={priority}
            >
              <option value="Informational">Normal</option>
              <option value="Important">Important</option>
              <option value="Critical">Urgent</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Message
          </span>
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
            onChange={(event) => setContent(event.target.value)}
            placeholder="What do families or staff need to know?"
            value={content}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] font-semibold text-slate-400">
            Sending to {targetLabel}
          </p>
          <button
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void saveAnnouncement()}
            type="button"
          >
            {isSaving ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </details>
  );
}
