"use client";

import { useState } from "react";
import type { MessageAudience, MessagePriority } from "../data/messages";

type CoachTeamMessageFormProps = {
  eventId?: string;
  teamId: string;
};

type CoachTeamMessageResponse = {
  error?: string;
  id?: string;
  message?: string;
};

type CoachMessageTarget = "both" | "coaches" | "parents";

const coachMessageTargets: {
  audience: MessageAudience[];
  label: string;
  value: CoachMessageTarget;
}[] = [
  { audience: ["parent"], label: "Parents", value: "parents" },
  { audience: ["coach"], label: "Coaches", value: "coaches" },
  { audience: ["parent", "coach"], label: "Both", value: "both" },
];

function getAudienceForTarget(target: CoachMessageTarget) {
  return (
    coachMessageTargets.find((item) => item.value === target)?.audience ?? [
      "parent",
    ]
  );
}

export default function CoachTeamMessageForm({
  eventId,
  teamId,
}: CoachTeamMessageFormProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] =
    useState<MessagePriority>("Informational");
  const [target, setTarget] = useState<CoachMessageTarget>("parents");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/coach/messages", {
        body: JSON.stringify({
          audience: getAudienceForTarget(target),
          content,
          eventId,
          priority,
          subject,
          teamId,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | CoachTeamMessageResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not send this message.");
      }

      setSubject("");
      setContent("");
      setTarget("parents");
      setMessage(body?.message ?? "Message sent.");
      window.location.reload();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send this message.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/40 p-2.5">
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-400">
            Send to
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {coachMessageTargets.map((option) => (
              <button
                className={`rounded-md border px-2 py-2 text-xs font-black transition ${
                  target === option.value
                    ? "border-blue-300/40 bg-blue-500/20 text-white"
                    : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
                }`}
                key={option.value}
                onClick={() => setTarget(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Priority
          </span>
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
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

      <label className="mt-2 block">
        <span className="text-[11px] font-bold uppercase text-slate-400">
          Title
        </span>
        <input
          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Practice update"
          value={subject}
        />
      </label>

      <label className="mt-2 block">
        <span className="text-[11px] font-bold uppercase text-slate-400">
          Message
        </span>
        <textarea
          className="mt-1 min-h-16 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
          onChange={(event) => setContent(event.target.value)}
          placeholder="What should this team know?"
          value={content}
        />
      </label>

      {message && (
        <p className="mt-2 rounded-md border border-blue-300/20 bg-blue-500/10 p-2 text-xs font-semibold text-blue-100">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md border border-red-300/20 bg-red-500/10 p-2 text-xs font-semibold text-red-100">
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-400">
          {eventId ? "Event update" : "Team message"}
        </p>
        <button
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void sendMessage()}
          type="button"
        >
          {isSaving ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
